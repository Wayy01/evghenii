import path from "node:path";

// Uploads live outside `public/` because `next start` only serves files that
// existed at build time; /files/[...path] streams them at request time.
export const UPLOAD_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads");

export const MAX_UPLOAD_BYTES = 300 * 1024 * 1024;

export const UPLOAD_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(UPLOAD_TYPES).map(([type, ext]) => [ext, type]),
);

/** Resolves a public `/files/...` sub-path inside the upload root, or null if it escapes it. */
export function resolveUpload(segments: string[]): string | null {
  const target = path.resolve(UPLOAD_ROOT, ...segments);
  return target.startsWith(UPLOAD_ROOT + path.sep) ? target : null;
}
