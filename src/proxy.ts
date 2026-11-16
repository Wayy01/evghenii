import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/session";

function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;
  const accept = request.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (tag === "ru" || tag === "uk" || tag === "be") return "ru";
    if (tag === "ro" || tag === "mo") return "ro";
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, second, third] = pathname.split("/");

  if (!hasLocale(first ?? "")) {
    const url = request.nextUrl.clone();
    url.pathname = `/${preferredLocale(request)}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  if (second === "admin" && third !== "login") {
    if (!verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${first}/admin/login`;
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  if (request.cookies.get(LOCALE_COOKIE)?.value !== first) {
    response.cookies.set(LOCALE_COOKIE, first, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|files|media|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.[a-z0-9]+$).*)",
  ],
};
