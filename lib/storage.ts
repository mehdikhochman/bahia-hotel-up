/**
 * Storage adapter for sensitive ID scans.
 *
 *   • Production (Vercel + BLOB_READ_WRITE_TOKEN) → Vercel Blob, private upload.
 *   • Local dev → /.uploads/ outside `public/`. Served via /api/identification/[key]
 *     (admin auth required — not implemented in this scaffold).
 */
import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export type StoredFile = {
  url: string;
  key: string;
  size: number;
  contentType: string;
};

export async function storeIdScan(
  file: File,
  bookingReference: string
): Promise<StoredFile> {
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 5);
  const random = randomBytes(8).toString("hex");
  const key = `id-scans/${bookingReference}/${random}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, buf, {
      access: "public", // signed-URL semantics not supported on free tier — wrap behind admin route in prod
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      key,
      size: buf.byteLength,
      contentType: file.type,
    };
  }

  // Local dev fallback — file lives on disk under `.uploads/`.
  // We use a `local:` sentinel for `url` because the legacy public route is
  // gone (Sprint 1) — files are served exclusively via the authenticated
  // admin proxy `/admin/api/scan/[bookingId]` using `imageKey`.
  const root = path.join(process.cwd(), ".uploads");
  const target = path.join(root, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buf);
  return {
    url: `local:${key}`,
    key,
    size: buf.byteLength,
    contentType: file.type,
  };
}

export async function readIdScanLocal(key: string) {
  const root = path.join(process.cwd(), ".uploads");
  const target = path.join(root, key);
  // Defensive: ensure the resolved path stays under .uploads
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(root))) {
    throw new Error("Invalid key");
  }
  return fs.readFile(resolved);
}
