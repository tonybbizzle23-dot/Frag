// API handler — handles all /api/* routes directly in the Bun server.
// This bypasses TanStack Start routing for API endpoints, which is simpler
// for file uploads and FFmpeg processing.
//
// All video and clip data is stored in Cloudflare R2 (S3-compatible),
// with transparent local-filesystem fallback when R2 is unavailable.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, unlink, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import {
  uploadToStorage,
  getBufferFromStorage,
  getDownloadUrl,
  deleteFromStorage,
  objectExistsInStorage,
} from "./r2-client";

const TEMP_DIR = path.join(os.tmpdir(), "fragclip");
const LOCAL_DIR = "/home/team/shared/uploads";

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function apiRouter(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // GET /api/video/:id/exists
    const existsMatch = pathname.match(/^\/api\/video\/([^/]+)\/exists$/);
    if (existsMatch && method === "GET") {
      const id = existsMatch[1];
      const found = await objectExistsInStorage(`uploads/${id}.mp4`);
      return json({ exists: found });
    }

    // POST /api/generate-test-video
    if (pathname === "/api/generate-test-video" && method === "POST") {
      const fileId = randomUUID();
      const tempPath = path.join(TEMP_DIR, `${fileId}.mp4`);

      await ensureDir(TEMP_DIR);

      const args = [
        "-f", "lavfi",
        "-i", "testsrc=duration=30:size=1280x720:rate=30",
        "-f", "lavfi",
        "-i", "sine=frequency=440:duration=30",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
        tempPath,
      ];

      await runFfmpeg(args);

      // Upload to storage (R2 or local)
      const fileContent = await readFile(tempPath);
      await uploadToStorage(`uploads/${fileId}.mp4`, fileContent, "video/mp4");

      // Clean up temp file
      await unlink(tempPath).catch(() => {});

      return json({ success: true, fileId });
    }

    // POST /api/upload (chunked)
    if (pathname === "/api/upload" && method === "POST") {
      try {
        const formData = await req.formData();
        const fileId = formData.get("fileId") as string;
        const chunkIndex = parseInt(formData.get("chunkIndex") as string);
        const totalChunks = parseInt(formData.get("totalChunks") as string);
        const fileName = formData.get("fileName") as string;
        const chunk = formData.get("chunk") as File;

        if (!fileId || isNaN(chunkIndex) || isNaN(totalChunks) || !fileName || !chunk) {
          return json({ error: "Missing required fields" }, 400);
        }

        // Validate fileId is a UUID to prevent path traversal
        if (!/^[0-9a-f-]{36}$/i.test(fileId)) {
          return json({ error: "Invalid fileId format" }, 400);
        }

        await ensureDir(TEMP_DIR);

        const chunkBuffer = Buffer.from(await chunk.arrayBuffer());
        const chunkPath = path.join(TEMP_DIR, `${fileId}_chunk_${chunkIndex}`);
        await writeFile(chunkPath, chunkBuffer);

        if (chunkIndex === totalChunks - 1) {
          const ext = path.extname(fileName) || ".mp4";
          const storageKey = `uploads/${fileId}${ext}`;

          // Assemble chunks
          const chunks: Buffer[] = [];
          for (let i = 0; i < totalChunks; i++) {
            const cp = path.join(TEMP_DIR, `${fileId}_chunk_${i}`);
            if (!existsSync(cp)) {
              return json({ error: `Missing chunk ${i}. Upload may have been interrupted.` }, 400);
            }
            chunks.push(await readFile(cp));
            await unlink(cp).catch(() => {});
          }

          const assembled = Buffer.concat(chunks);

          // Upload assembled video to storage
          await uploadToStorage(storageKey, assembled, "video/mp4");

          return json({ success: true, fileId, fileName: `${fileId}${ext}`, complete: true });
        }

        return json({ success: true, fileId, chunkIndex, complete: false });
      } catch (err: any) {
        return json({ error: err.message || "Upload failed" }, 500);
      }
    }

    // GET /api/video/:id
    const videoMatch = pathname.match(/^\/api\/video\/([^/]+)$/);
    if (videoMatch && method === "GET") {
      const id = videoMatch[1];

      // Check if video exists in storage
      const storageKey = `uploads/${id}.mp4`;
      const exists = await objectExistsInStorage(storageKey);
      if (!exists) return json({ error: "Video not found" }, 404);

      // Try presigned URL first, fall back to local serving
      const dlUrl = await getDownloadUrl(storageKey, 86400);
      if (dlUrl.startsWith("http")) {
        return Response.redirect(dlUrl, 302);
      }

      // Local serving
      const localPath = path.join(LOCAL_DIR, storageKey);
      const file = Bun.file(localPath);
      return new Response(file, {
        headers: {
          "Content-Type": file.type || "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // POST /api/generate-clips
    if (pathname === "/api/generate-clips" && method === "POST") {
      const body = await req.json();
      const { videoId, markers } = body as { videoId: string; markers: number[] };

      if (!videoId || !markers || !Array.isArray(markers) || markers.length === 0) {
        return json({ error: "videoId and markers array are required" }, 400);
      }

      const storageVideoKey = `uploads/${videoId}.mp4`;
      if (!(await objectExistsInStorage(storageVideoKey))) {
        return json({ error: "Video not found" }, 404);
      }

      // Download video from storage to temp file for FFmpeg
      await ensureDir(TEMP_DIR);
      const tempVideoPath = path.join(TEMP_DIR, `${videoId}_src.mp4`);

      const videoBuffer = await getBufferFromStorage(storageVideoKey);
      if (!videoBuffer) {
        return json({ error: "Failed to download video from storage" }, 500);
      }
      await writeFile(tempVideoPath, videoBuffer);

      // Prepare clip output temp dir
      const tempClipDir = path.join(TEMP_DIR, `clips_${videoId}`);
      await ensureDir(tempClipDir);

      // Save markers metadata
      const markersJsonStr = JSON.stringify(markers);

      const results: any[] = [];
      const errors: { markerIndex: number; variant: string; error: string }[] = [];
      const clipDuration = 15;
      const beforeSec = 10;

      for (let i = 0; i < markers.length; i++) {
        const markerTime = markers[i];
        const startTime = Math.max(0, markerTime - beforeSec);

        const landscapeFile = `clip_${i}_landscape.mp4`;
        const verticalFile = `clip_${i}_vertical.mp4`;
        const landscapePath = path.join(tempClipDir, landscapeFile);
        const verticalPath = path.join(tempClipDir, verticalFile);

        const clipResult: any = {
          markerIndex: i,
          markerTime,
          landscape: null as string | null,
          vertical: null as string | null,
          landscapeUrl: null as string | null,
          verticalUrl: null as string | null,
          errors: [] as string[],
        };

        // Landscape
        try {
          await runFfmpeg([
            "-ss", String(startTime),
            "-i", tempVideoPath,
            "-t", String(clipDuration),
            "-vf", "drawtext=text='FragClip':x=10:y=h-th-10:fontsize=20:fontcolor=white@0.5:box=1:boxcolor=black@0.3:boxborderw=5",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-y", landscapePath,
          ]);
          await validateOutput(landscapePath);

          // Upload to storage
          const clipBuffer = await readFile(landscapePath);
          const clipKey = `clips/${videoId}/${landscapeFile}`;
          await uploadToStorage(clipKey, clipBuffer, "video/mp4");

          // Generate download URL (presigned or local)
          const dlUrl = await getDownloadUrl(clipKey, 604800);
          clipResult.landscape = landscapeFile;
          clipResult.landscapeUrl = dlUrl;

          // Clean up temp file
          await unlink(landscapePath).catch(() => {});
        } catch (err: any) {
          await unlink(landscapePath).catch(() => {});
          clipResult.errors.push(`landscape: ${err.message}`);
          errors.push({ markerIndex: i, variant: "landscape", error: err.message });
        }

        // Vertical
        try {
          await runFfmpeg([
            "-ss", String(startTime),
            "-i", tempVideoPath,
            "-t", String(clipDuration),
            "-vf", "crop=ih*9/16:ih,scale=1080:1920,drawtext=text='FragClip':x=10:y=h-th-10:fontsize=20:fontcolor=white@0.5:box=1:boxcolor=black@0.3:boxborderw=5",
            "-c:v", "libx264", "-preset", "fast", "-crf", "20",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-y", verticalPath,
          ]);
          await validateOutput(verticalPath);

          // Upload to storage
          const clipBuffer = await readFile(verticalPath);
          const clipKey = `clips/${videoId}/${verticalFile}`;
          await uploadToStorage(clipKey, clipBuffer, "video/mp4");

          // Generate download URL
          const dlUrl = await getDownloadUrl(clipKey, 604800);
          clipResult.vertical = verticalFile;
          clipResult.verticalUrl = dlUrl;

          // Clean up temp file
          await unlink(verticalPath).catch(() => {});
        } catch (err: any) {
          await unlink(verticalPath).catch(() => {});
          clipResult.errors.push(`vertical: ${err.message}`);
          errors.push({ markerIndex: i, variant: "vertical", error: err.message });
        }

        results.push(clipResult);
      }

      // Upload markers.json to storage
      await uploadToStorage(
        `clips/${videoId}/markers.json`,
        Buffer.from(markersJsonStr),
        "application/json"
      );

      // Clean up temp source video
      await unlink(tempVideoPath).catch(() => {});

      return json({
        success: true,
        clips: results,
        errors: errors.length > 0 ? errors : undefined,
        generatedCount: results.filter((r) => r.landscape || r.vertical).length,
        totalCount: results.length,
      });
    }

    // GET /api/clips/:id/:file
    const clipMatch = pathname.match(/^\/api\/clips\/([^/]+)\/([^/]+)$/);
    if (clipMatch && method === "GET") {
      const [, id, file] = clipMatch;

      // Validate: only allow clip_*.mp4
      if (!/^clip_\d+_(landscape|vertical)\.mp4$/.test(file)) {
        return json({ error: "Invalid clip path" }, 400);
      }

      const storageKey = `clips/${id}/${file}`;
      if (!(await objectExistsInStorage(storageKey))) {
        return json({ error: "Clip not found" }, 404);
      }

      // Try presigned URL first, fall back to local serving
      const dlUrl = await getDownloadUrl(storageKey, 604800);
      if (dlUrl.startsWith("http")) {
        return Response.redirect(dlUrl, 302);
      }

      // Local serving
      const localPath = path.join(LOCAL_DIR, storageKey);
      const f = Bun.file(localPath);
      return new Response(f, {
        headers: {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // POST /api/list-clips
    if (pathname === "/api/list-clips" && method === "POST") {
      const body = await req.json();
      const { videoId } = body as { videoId: string };

      if (!videoId) return json({ error: "videoId is required" }, 400);

      // Check if markers.json exists
      const markersKey = `clips/${videoId}/markers.json`;
      if (!(await objectExistsInStorage(markersKey))) return json({ clips: [] });

      // Read marker metadata from storage
      let markerTimes: number[] = [];
      try {
        const raw = await getBufferFromStorage(markersKey);
        if (raw) {
          markerTimes = JSON.parse(raw.toString("utf-8"));
        }
      } catch {
        // ignore corrupt metadata
      }

      // Build clip list from markers data
      const clipChecks: Promise<{
        idx: number;
        landscape: string;
        vertical: string;
        landscapeUrl: string;
        verticalUrl: string;
      }>[] = [];

      for (let i = 0; i < markerTimes.length; i++) {
        clipChecks.push(
          (async () => {
            const landscapeFile = `clip_${i}_landscape.mp4`;
            const verticalFile = `clip_${i}_vertical.mp4`;
            let landscape = "";
            let vertical = "";
            let landscapeUrl = "";
            let verticalUrl = "";

            const [landExists, vertExists] = await Promise.all([
              objectExistsInStorage(`clips/${videoId}/${landscapeFile}`),
              objectExistsInStorage(`clips/${videoId}/${verticalFile}`),
            ]);

            if (landExists) {
              landscape = landscapeFile;
              landscapeUrl = await getDownloadUrl(
                `clips/${videoId}/${landscapeFile}`,
                604800
              );
            }
            if (vertExists) {
              vertical = verticalFile;
              verticalUrl = await getDownloadUrl(
                `clips/${videoId}/${verticalFile}`,
                604800
              );
            }

            return { idx: i, landscape, vertical, landscapeUrl, verticalUrl };
          })()
        );
      }

      const resolved = await Promise.all(clipChecks);
      const clips = resolved
        .sort((a, b) => a.idx - b.idx)
        .map(({ idx, landscape, vertical, landscapeUrl, verticalUrl }) => ({
          markerIndex: idx,
          markerTime: markerTimes[idx] ?? 0,
          landscape,
          vertical,
          landscapeUrl,
          verticalUrl,
        }));

      return json({ clips });
    }

    return json({ error: "Not found" }, 404);
  } catch (err: any) {
    return json({ error: err.message || "Internal server error" }, 500);
  }
}

// ── Helpers ──

async function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

const MIN_CLIP_SIZE = 10_000; // 10KB minimum for a valid clip

async function validateOutput(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error("Output file was not created");
  }
  const s = await stat(filePath);
  if (s.size < MIN_CLIP_SIZE) {
    throw new Error(`Output file is too small (${s.size} bytes) — encoding may have failed`);
  }
}

async function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = Bun.spawn(["ffmpeg", ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });

    let stderr = "";
    let exited = false;
    const FFMPEG_TIMEOUT_MS = 120_000; // 2 minutes per clip variant

    // Collect stderr for error reporting
    const stderrPromise = (async () => {
      const reader = proc.stderr.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        stderr += new TextDecoder().decode(value);
      }
    })();

    // Timeout guard
    const timeout = setTimeout(() => {
      if (!exited) {
        proc.kill("SIGKILL");
        reject(new Error(`FFmpeg timed out after ${FFMPEG_TIMEOUT_MS / 1000}s`));
      }
    }, FFMPEG_TIMEOUT_MS);

    proc.exited
      .then(async (code) => {
        clearTimeout(timeout);
        exited = true;
        // Wait for stderr to be fully collected before resolving/rejecting
        await stderrPromise;
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `FFmpeg exited with code ${code}: ${stderr.slice(-500).trim() || "(no output)"}`
            )
          );
        }
      })
      .catch(async (err) => {
        clearTimeout(timeout);
        exited = true;
        await stderrPromise.catch(() => {});
        reject(err);
      });
  });
}
