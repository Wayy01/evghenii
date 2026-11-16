"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocale } from "@/i18n/config";
import {
  createSessionValue,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/session";

export type LoginState = { error: boolean };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawLocale = String(formData.get("locale") ?? "ro");
  const locale = hasLocale(rawLocale) ? rawLocale : "ro";
  const password = String(formData.get("password") ?? "");

  if (!passwordMatches(password)) {
    // Slows down guessing without needing a rate-limit store.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return { error: true };
  }

  const store = await cookies();
  // Follow the page origin: https behind Tailscale Serve, but a plain-http
  // visit (LAN IP, localhost) must still be able to keep the cookie.
  const origin = (await headers()).get("origin") ?? "";
  store.set(SESSION_COOKIE, createSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(`/${locale}/admin`);
}

export async function logoutAction(formData: FormData) {
  const rawLocale = String(formData.get("locale") ?? "ro");
  const locale = hasLocale(rawLocale) ? rawLocale : "ro";
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect(`/${locale}/admin/login`);
}
