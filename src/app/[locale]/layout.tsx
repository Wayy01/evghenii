import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Onest, Sofia_Sans_Extra_Condensed } from "next/font/google";
import { hasLocale, locales } from "@/i18n/config";
import { getSiteDict } from "@/i18n/dictionaries";
import "../globals.css";

const onest = Onest({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-onest",
  display: "swap",
});

const sofia = Sofia_Sans_Extra_Condensed({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["700", "800"],
  variable: "--font-sofia",
  display: "swap",
});

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Pages read the database, which only the running app can reach, so they render on request
// and are allowed to block on it rather than stream from a prerendered placeholder.
export const instant = false;

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const t = await getSiteDict(locale);
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3300"),
    title: { default: t.meta.title, template: "%s | Evghenii" },
    description: t.meta.description,
    alternates: { languages: { ro: "/ro", ru: "/ru" } },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      images: ["/media/reels/DZZ1izDo0ZQ.jpg"],
      locale: locale === "ru" ? "ru_RU" : "ro_RO",
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eeeeeb" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f11" },
  ],
  viewportFit: "cover",
};

// The metadata above reads the owner's text edits from the database at request time. On a
// page that is otherwise static (the admin login), Next needs this marker to accept that.
async function RequestTime() {
  await connection();
  return null;
}

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${onest.variable} ${sofia.variable}`} suppressHydrationWarning>
      <head>
        {/* Flags JS before first paint so scroll reveals can start hidden without a flash. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
        {children}
        <Suspense>
          <RequestTime />
        </Suspense>
      </body>
    </html>
  );
}
