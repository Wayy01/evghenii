import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/cn";

export function Wordmark({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  return (
    <Link
      href={`/${locale}`}
      aria-label={`Evghenii, ${label}`}
      className={cn("display text-[1.75rem] leading-none tracking-[0.01em]", className)}
    >
      Evghenii
    </Link>
  );
}
