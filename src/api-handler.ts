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

import bcrypt from "bcryptjs";
import { sql } from "./db";
import {
  createSession,
  getSessionFromCookie,
  deleteSession,
  sessionCookieHeader,
  SESSION_COOKIE,
} from "./auth";

import {
  uploadToStorage,
  getBufferFromStorage,
  getDownloadUrl,
  objectExistsInStorage,
  deleteFromStorage,
} from "./r2-client";

import {
  getStripe,
  STRIPE_PRO_PRICE_ID,
  isProStatus,
  normalizeSubscriptionStatus,
} from "./stripe";
import { sendWelcomeEmail } from "./email";

const TEMP_DIR = path.join(os.tmpdir(), "fragclip");
const LOCAL_DIR = "/home/team/shared/uploads";

function json(data: any, status = 200, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

/** Read a specific cookie value from a Cookie header string. */
function parseCookie(header: string, name: string): string | null {
  for (const cookie of header.split(";")) {
    const [key, ...rest] = cookie.trim().split("=");
    if (key === name) {
      return rest.join("=") || null;
    }
  }
  return null;
}

export async function apiRouter(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // ── Auth routes ──

    // POST /api/markers — record a desktop companion highlight marker.
    if (pathname === "/api/markers" && method === "POST") {
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
      const body = await req.json().catch(() => null);
      const { timestamp, windowTitle, sessionId } = body || {};
      if (!sessionId || typeof sessionId !== "string" || sessionId.length > 200) {
        return json({ error: "sessionId is required" }, 400);
      }
      const parsedTimestamp = new Date(timestamp);
      if (!timestamp || Number.isNaN(parsedTimestamp.getTime())) {
        return json({ error: "timestamp must be a valid ISO 8601 date" }, 400);
      }
      const db = sql();
      const [marker] = await db`
        INSERT INTO markers (user_id, session_id, timestamp, window_title)
        VALUES (${user.id}, ${sessionId}, ${parsedTimestamp.toISOString()}, ${typeof windowTitle === "string" ? windowTitle.slice(0, 500) : null})
        RETURNING id, session_id, timestamp, window_title, created_at
      `;
      return json({ marker }, 201);
    }

    // POST /api/auth/signup
    if (pathname === "/api/auth/signup" && method === "POST") {
      const body = await req.json().catch(() => null);
      const { email, password } = body || {};

      if (!email || !password) {
        return json({ error: "Email and password are required" }, 400);
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ error: "Invalid email format" }, 400);
      }

      // Validate password length
      if (password.length < 8) {
        return json({ error: "Password must be at least 8 characters" }, 400);
      }

      const db = sql();

      // Check for existing user
      const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
      if (existing.length > 0) {
        return json({ error: "A user with this email already exists" }, 409);
      }

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 10);
      const [user] = await db`
        INSERT INTO users (email, password_hash)
        VALUES (${email}, ${passwordHash})
        RETURNING id, email, subscription_tier, subscription_status
      `;

      // Create session
      const token = await createSession(user.id);
      const cookie = sessionCookieHeader(token);

      // Email delivery is best-effort: never prevent a newly created user from
      // receiving their session if the mail capability is unavailable/fails.
      void sendWelcomeEmail(user.email).catch((error) => {
        console.error("[auth/signup] Failed to send welcome email", error);
      });

      return json(
        {
          user: {
            id: user.id,
            email: user.email,
            subscription_tier: user.subscription_tier,
            subscription_status: user.subscription_status,
          },
        },
        200,
        { "Set-Cookie": cookie },
      );
    }

    // POST /api/auth/login
    if (pathname === "/api/auth/login" && method === "POST") {
      const body = await req.json().catch(() => null);
      const { email, password } = body || {};

      if (!email || !password) {
        return json({ error: "Email and password are required" }, 400);
      }

      const db = sql();

      // Find user
      const rows = await db`
        SELECT id, email, password_hash, subscription_tier, subscription_status
        FROM users WHERE email = ${email} LIMIT 1
      `;

      if (rows.length === 0) {
        return json({ error: "Invalid email or password" }, 401);
      }

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return json({ error: "Invalid email or password" }, 401);
      }

      // Create session
      const token = await createSession(user.id);
      const cookie = sessionCookieHeader(token);

      return json(
        {
          user: {
            id: user.id,
            email: user.email,
            subscription_tier: user.subscription_tier,
            subscription_status: user.subscription_status,
          },
        },
        200,
        { "Set-Cookie": cookie },
      );
    }

    // POST /api/auth/logout
    if (pathname === "/api/auth/logout" && method === "POST") {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const token = parseCookie(cookieHeader, SESSION_COOKIE);
        if (token) {
          await deleteSession(token);
        }
      }

      return json({ success: true }, 200, {
        "Set-Cookie": sessionCookieHeader("", true),
      });
    }

    // GET /api/auth/me
    if (pathname === "/api/auth/me" && method === "GET") {
      const user = await getSessionFromCookie(req);
      if (!user) {
        return json({ user: null });
      }
      return json({
        user: {
          id: user.id,
          email: user.email,
          subscription_tier: user.subscription_tier,
          subscription_status: user.subscription_status,
        },
      });
    }

    // GET /api/video/:id/exists
    const existsMatch = pathname.match(/^\/api\/video\/([^/]+)\/exists$/);
    if (existsMatch && method === "GET") {
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
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
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
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
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
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
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
      const body = await req.json();
      const { videoId, markers, originalFilename, game } = body as { videoId: string; markers: number[]; originalFilename?: string; game?: string };
      const db = sql();

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

        // Extract a representative thumbnail from the generated landscape clip.
        let thumbnailKey: string | null = null;
        if (clipResult.landscape) {
          const thumbnailPath = path.join(tempClipDir, `clip_${i}_thumb.jpg`);
          try {
            await runFfmpeg(["-ss", "2", "-i", path.join(tempClipDir, landscapeFile), "-frames:v", "1", "-q:v", "3", "-y", thumbnailPath]);
            await validateOutput(thumbnailPath);
            thumbnailKey = `clips/${videoId}/clip_${i}_thumb.jpg`;
            await uploadToStorage(thumbnailKey, await readFile(thumbnailPath), "image/jpeg");
          } catch (err: any) {
            clipResult.errors.push(`thumbnail: ${err.message}`);
          } finally {
            await unlink(thumbnailPath).catch(() => {});
          }
        }

        const status = clipResult.landscape || clipResult.vertical ? "ready" : "failed";
        await db`
          INSERT INTO clips (user_id, video_id, marker_index, marker_time, landscape_storage_key,
            vertical_storage_key, thumbnail_storage_key, original_filename, game, duration_seconds, status)
          VALUES (${user.id}, ${videoId}, ${i}, ${markerTime},
            ${clipResult.landscape ? `clips/${videoId}/${landscapeFile}` : null},
            ${clipResult.vertical ? `clips/${videoId}/${verticalFile}` : null}, ${thumbnailKey},
            ${typeof originalFilename === "string" ? originalFilename.slice(0, 500) : null},
            ${typeof game === "string" ? game.slice(0, 100) : null}, ${clipResult.landscape || clipResult.vertical ? clipDuration : null},
            ${status})
        `;
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

    // GET /api/clips — persistent clip library.
    if (pathname === "/api/clips" && method === "GET") {
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
      const rows = await sql()`SELECT * FROM clips WHERE user_id = ${user.id} ORDER BY created_at DESC`;
      const clips = await Promise.all(rows.map(async (clip: any) => ({
        ...clip,
        landscapeUrl: clip.landscape_storage_key ? await getDownloadUrl(clip.landscape_storage_key, 604800) : null,
        verticalUrl: clip.vertical_storage_key ? await getDownloadUrl(clip.vertical_storage_key, 604800) : null,
        thumbnailUrl: clip.thumbnail_storage_key ? await getDownloadUrl(clip.thumbnail_storage_key, 604800) : null,
      })));
      return json({ clips });
    }

    // DELETE /api/clips/:id — delete only the authenticated user's clip.
    const clipDeleteMatch = pathname.match(/^\/api\/clips\/([^/]+)$/);
    if (clipDeleteMatch && method === "DELETE") {
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
      const [clip] = await sql()`SELECT * FROM clips WHERE id = ${clipDeleteMatch[1]} LIMIT 1`;
      if (!clip) return json({ error: "Clip not found" }, 404);
      if (clip.user_id !== user.id) return json({ error: "Forbidden" }, 403);
      await Promise.all([clip.landscape_storage_key, clip.vertical_storage_key, clip.thumbnail_storage_key]
        .filter(Boolean).map((key) => deleteFromStorage(key)));
      await sql()`DELETE FROM clips WHERE id = ${clip.id} AND user_id = ${user.id}`;
      return json({ success: true });
    }

    // GET /api/clips/:id/:file
    const clipMatch = pathname.match(/^\/api\/clips\/([^/]+)\/([^/]+)$/);
    if (clipMatch && method === "GET") {
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
      const [, id, file] = clipMatch;
      const [owned] = await sql()`SELECT 1 FROM clips WHERE user_id = ${user.id} AND video_id = ${id} AND marker_index = ${Number(file.match(/^clip_(\d+)_/)?.[1] ?? -1)} LIMIT 1`;
      if (!owned) return json({ error: "Clip not found" }, 404);

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
      const user = await getSessionFromCookie(req);
      if (!user) return json({ error: "Authentication required" }, 401);
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

    // ── Stripe routes ──

    // POST /api/stripe/create-checkout
    // Creates a Stripe Checkout Session for the FragClip Pro subscription.
    // Requires an authenticated session cookie; returns the hosted Checkout URL.
    if (pathname === "/api/stripe/create-checkout" && method === "POST") {
      const user = await getSessionFromCookie(req);
      if (!user) {
        return json({ error: "You must be logged in to upgrade." }, 401);
      }

      let session;
      try {
        const origin = new URL(req.url).origin;
        session = await getStripe().checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: STRIPE_PRO_PRICE_ID, quantity: 1 }],
          success_url: `${origin}/app?upgraded=true`,
          cancel_url: `${origin}/app`,
          client_reference_id: user.id,
          metadata: { userId: user.id },
          customer_email: user.email,
          // Managed Payments is enabled by default on the owner's Stripe
          // account and requires an eligible product tax_code on every line
          // item. Disable it per-session so checkout works without product
          // tax configuration (standard payments still collect no tax; if the
          // owner later enables Stripe Tax, remove this flag and set eligible
          // tax codes on the products instead).
          managed_payments: { enabled: false },
        });
      } catch (err: any) {
        console.error("[stripe] checkout session creation failed:", err.message);
        return json(
          { error: "Checkout is temporarily unavailable. Please try again later." },
          502,
        );
      }

      if (!session.url) {
        return json({ error: "Checkout could not be started." }, 500);
      }
      return json({ url: session.url });
    }

    // POST /api/stripe/webhook
    // Receives Stripe subscription events. Signature is verified with
    // STRIPE_WEBHOOK_SECRET; if that secret is not configured yet, we log a
    // warning and process the event anyway (dev convenience — the owner must
    // configure the webhook secret before going live).
    if (pathname === "/api/stripe/webhook" && method === "POST") {
      const sig = req.headers.get("stripe-signature");
      const rawBody = await req.text();
      const secret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: any;
      if (secret) {
        try {
          // constructEventAsync (not constructEvent): the SDK's sync method
          // uses a SubtleCryptoProvider that throws under Bun ("cannot be used
          // in a synchronous context"). The async variant works fine.
          event = await getStripe().webhooks.constructEventAsync(
            rawBody,
            sig ?? "",
            secret,
          );
        } catch (err: any) {
          console.error("[stripe] webhook signature verification failed:", err.message);
          return json({ error: "Invalid signature" }, 400);
        }
      } else {
        console.warn(
          "[stripe] STRIPE_WEBHOOK_SECRET is not set — webhook signature NOT verified. " +
            "Set it in .env.local (and the Stripe dashboard) before going live.",
        );
        try {
          event = JSON.parse(rawBody);
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
      }

      const db = sql();
      const eventData = event?.data?.object ?? {};
      const customerId =
        typeof eventData.customer === "string" ? eventData.customer : null;

      switch (event.type) {
        case "checkout.session.completed": {
          const userId = eventData.client_reference_id as string | undefined;
          const subscriptionId =
            typeof eventData.subscription === "string" ? eventData.subscription : null;
          const email = eventData.customer_details?.email as string | undefined;

          // Locate the user: prefer client_reference_id (user UUID), fall back
          // to the email Stripe collected at checkout.
          let targetId = userId ?? null;
          if (!targetId && email) {
            const rows = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
            targetId = rows[0]?.id ?? null;
          }
          if (!targetId) {
            console.warn("[stripe] checkout.session.completed: no matching user", {
              userId,
              email,
            });
            break;
          }

          await db`
            UPDATE users SET
              stripe_customer_id = ${customerId},
              stripe_subscription_id = ${subscriptionId},
              subscription_status = 'active',
              subscription_tier = 'pro',
              updated_at = now()
            WHERE id = ${targetId}
          `;
          console.log(
            `[stripe] user ${targetId} upgraded to Pro (subscription ${subscriptionId})`,
          );
          break;
        }

        case "customer.subscription.updated": {
          const status = normalizeSubscriptionStatus(eventData.status ?? "active");
          const subId = typeof eventData.id === "string" ? eventData.id : null;
          await db`
            UPDATE users SET
              stripe_subscription_id = ${subId},
              subscription_status = ${status},
              subscription_tier = ${isProStatus(status) ? "pro" : "free"},
              updated_at = now()
            WHERE stripe_customer_id = ${customerId}
          `;
          break;
        }

        case "customer.subscription.deleted": {
          await db`
            UPDATE users SET
              subscription_status = 'canceled',
              subscription_tier = 'free',
              updated_at = now()
            WHERE stripe_customer_id = ${customerId}
          `;
          break;
        }

        default:
          // Acknowledge the event; only the events above affect user state.
          break;
      }

      return json({ received: true });
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
