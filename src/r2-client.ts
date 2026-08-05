// R2 (Cloudflare S3-compatible) client for FragClip.
// All video uploads, generated clips, and metadata live in R2 when available.
// Falls back to local filesystem if R2 credentials are unavailable or failing.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";

// ── Local fallback dir ──
const LOCAL_DIR = "/home/team/shared/uploads";

// ── R2 config ──
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET_NAME || "R2_bucket_frgclp";

let _r2Available: boolean | null = null;
let _r2Client: S3Client | null = null;

function getR2Client(): S3Client | null {
  if (_r2Client) return _r2Client;
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) return null;
  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  return _r2Client;
}

/** Check if R2 is operational. Caches result. */
export async function isR2Available(): Promise<boolean> {
  if (_r2Available !== null) return _r2Available;
  const client = getR2Client();
  if (!client) {
    _r2Available = false;
    return false;
  }
  try {
    // Quick connectivity check: try to head a known key
    await client.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: "__r2_check__" })
    );
    _r2Available = true;
  } catch (err: any) {
    if (err.name === "NotFound" || err.name === "NoSuchKey") {
      // Bucket is accessible, just key doesn't exist — try a simple put
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: "__r2_check__",
            Body: "ok",
            ContentType: "text/plain",
          })
        );
        _r2Available = true;
      } catch {
        _r2Available = false;
      }
    } else {
      _r2Available = false;
    }
  }
  return _r2Available;
}

/** Reset the availability check (call after credentials change) */
export function resetR2Check() {
  _r2Available = null;
}

// ── Local helpers ──

async function ensureLocalDir(dir: string) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function localKeyToPath(key: string): string {
  return path.join(LOCAL_DIR, key);
}

// ── Unified API ──

/**
 * Upload data to storage (R2 if available, otherwise local fs).
 */
export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<"r2" | "local"> {
  if (await isR2Available()) {
    const client = getR2Client()!;
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    return "r2";
  }

  // Local fallback
  const localPath = localKeyToPath(key);
  await ensureLocalDir(path.dirname(localPath));
  await writeFile(localPath, body);
  return "local";
}

/**
 * Get data as Buffer from storage.
 */
export async function getBufferFromStorage(key: string): Promise<Buffer | null> {
  if (await isR2Available()) {
    const client = getR2Client()!;
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: key })
      );
      // result.Body is either a web ReadableStream or a Node Readable depending on runtime
      const body = result.Body;
      if (!body) return null;
      // @aws-sdk v3: transformToByteArray works on both stream types
      const bytes = await (body as any).transformToByteArray?.() ?? 
        (body as any).transformToString?.('base64').then((s: string) => Buffer.from(s, 'base64'));
      if (!bytes) return null;
      return Buffer.from(bytes);
    } catch (err: any) {
      if (err.name === "NoSuchKey") return null;
      throw err;
    }
  }

  // Local fallback
  const localPath = localKeyToPath(key);
  if (!existsSync(localPath)) return null;
  return readFile(localPath);
}

/**
 * Generate a presigned/download URL for an object.
 */
export async function getDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (await isR2Available()) {
    const client = getR2Client()!;
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
      { expiresIn }
    );
  }

  // Local fallback: return a local API URL
  // Map R2-style keys back to local API paths
  if (key.startsWith("uploads/")) {
    const id = key.replace("uploads/", "").replace(/\.\w+$/, "");
    return `/api/video/${id}`;
  }
  if (key.startsWith("clips/")) {
    const parts = key.split("/");
    const videoId = parts[1];
    const file = parts.slice(2).join("/");
    return `/api/clips/${videoId}/${file}`;
  }
  return `/api/local/${key}`;
}

/**
 * Delete an object from storage.
 */
export async function deleteFromStorage(key: string): Promise<void> {
  if (await isR2Available()) {
    const client = getR2Client()!;
    await client.send(
      new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return;
  }

  // Local fallback
  const localPath = localKeyToPath(key);
  await unlink(localPath).catch(() => {});
}

/**
 * Check if an object exists in storage.
 */
export async function objectExistsInStorage(key: string): Promise<boolean> {
  if (await isR2Available()) {
    const client = getR2Client()!;
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: BUCKET, Key: key })
      );
      return true;
    } catch (err: any) {
      if (
        err.name === "NotFound" ||
        err.name === "NoSuchKey" ||
        err.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw err;
    }
  }

  // Local fallback
  return existsSync(localKeyToPath(key));
}

export { BUCKET };
