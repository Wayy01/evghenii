import type { Metadata } from "next";
import { AdminI18nProvider } from "@/i18n/client";
import { hasLocale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getAdminDict(hasLocale(locale) ? locale : "ro");
  return {
    title: { default: t.meta.title, template: `%s | ${t.meta.title}` },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = hasLocale(raw) ? raw : "ro";
  const dict = await getAdminDict(locale);
  return (
    <AdminI18nProvider locale={locale} dict={dict}>
      {children}
    </AdminI18nProvider>
  );
}
