"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

const row = "flex items-center gap-0.5 text-sm font-semibold";
const item = "rounded-full px-2.5 py-1.5 uppercase transition-colors duration-200";

/** Swaps the locale segment and keeps the visitor on the same page. */
export function LocaleSwitch({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");

  return (
    <nav aria-label={label} className={cn(row, className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? "true" : undefined}
          className={cn(item, l === locale ? "bg-fg/8 text-fg" : "text-muted hover:text-fg")}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}

/** Shown while the real switch waits for the URL; links to each locale's home. */
export function LocaleSwitchFallback({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn(row, className)}>
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}`}
          hrefLang={l}
          lang={l}
          className={cn(item, l === locale ? "bg-fg/8 text-fg" : "text-muted hover:text-fg")}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
