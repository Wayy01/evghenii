import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless admin session: `<expiry>.<hmac(expiry)>`. Kept free of next/headers
// so the proxy can verify it before any admin route renders.
export const SESSION_COOKIE = "ev_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;

const sign = (payload: string) =>
  createHmac("sha256", process.env.SESSION_SECRET!).update(payload).digest("base64url");

export function createSessionValue(): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  return `${expires}.${sign(String(expires))}`;
}

export function verifySessionValue(value: string | undefined): boolean {
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature) return false;
  const expected = Buffer.from(sign(expires));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  return Number(expires) > Date.now() / 1000;
}

export function passwordMatches(input: string): boolean {
  const expected = createHmac("sha256", "pw").update(process.env.ADMIN_PASSWORD ?? "").digest();
  const given = createHmac("sha256", "pw").update(input).digest();
  return Boolean(process.env.ADMIN_PASSWORD) && timingSafeEqual(expected, given);
}
