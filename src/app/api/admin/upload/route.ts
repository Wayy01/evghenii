import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { cookies } from "next/headers";
import { MAX_UPLOAD_BYTES, UPLOAD_ROOT, UPLOAD_TYPES } from "@/lib/admin/uploads";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/session";

// The file arrives as the raw request body (not multipart) so it can be streamed
// straight to disk without buffering a whole video in memory.
export async function POST(request: Request) {
  const store = await cookies();
  if (!verifySessionValue(store.get(SESSION_COOKIE)?.value)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = UPLOAD_TYPES[type];
  if (!ext) return Response.json({ error: "unsupported" }, { status: 415 });

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES) return Response.json({ error: "tooLarge" }, { status: 413 });
  if (!request.body) return Response.json({ error: "empty" }, { status: 400 });

  const month = new Date().toISOString().slice(0, 7);
  const name = `${randomBytes(12).toString("base64url")}.${ext}`;
  const dir = path.join(UPLOAD_ROOT, month);
  const target = path.join(dir, name);
  await mkdir(dir, { recursive: true });

  let received = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _enc, callback) {
      received += chunk.length;
      if (received > MAX_UPLOAD_BYTES) callback(new Error("tooLarge"));
      else callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(request.body as import("node:stream/web").ReadableStream),
      limit,
      createWriteStream(target),
    );
  } catch (error) {
    await unlink(target).catch(() => {});
    const tooLarge = error instanceof Error && error.message === "tooLarge";
    return Response.json({ error: tooLarge ? "tooLarge" : "failed" }, { status: tooLarge ? 413 : 500 });
  }

  return Response.json({ url: `/files/${month}/${name}`, size: received });
}
