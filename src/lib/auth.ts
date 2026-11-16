import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Locale } from "@/i18n/config";
import { SESSION_COOKIE, verifySessionValue } from "./session";

export async function isAdmin(): Promise<boolean> {
  // Session expiry reads the clock, so mark this as request-time work; otherwise
  // runtime prefetching would try to prerender it with cookies but no clock.
  await connection();
  const store = await cookies();
  return verifySessionValue(store.get(SESSION_COOKIE)?.value);
}

/**
 * Call at the top of every admin data loader and admin Server Action.
 * The proxy already bounces anonymous visitors, but actions are public
 * endpoints and must check on their own.
 */
export async function requireAdmin(locale: Locale = "ro"): Promise<void> {
  if (!(await isAdmin())) redirect(`/${locale}/admin/login`);
}
