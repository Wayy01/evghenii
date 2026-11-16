import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { LoginForm } from "@/components/admin/login-form";
import { hasLocale, locales, type Locale } from "@/i18n/config";
import { getAdminDict } from "@/i18n/dictionaries";
import { cn } from "@/lib/cn";

export default async function LoginPage({ params }: PageProps<"/[locale]/admin/login">) {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(raw) ? raw : "ro";
  const t = await getAdminDict(locale);

  return (
    <main className="page flex min-h-dvh flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex h-16 shrink-0 items-center justify-between lg:h-[72px]">
        <Link href={`/${locale}`} className="display text-[1.75rem] leading-none">
          Evghenii
        </Link>
        <nav aria-label={t.nav.language} className="flex items-center gap-0.5 text-sm font-semibold">
          {locales.map((l) => (
            <Link
              key={l}
              href={`/${l}/admin/login`}
              hrefLang={l}
              aria-current={l === locale ? "true" : undefined}
              className={cn(
                "inline-flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 uppercase transition-colors duration-200",
                l === locale ? "bg-fg/8 text-fg" : "text-muted hover:text-fg",
              )}
            >
              {l}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid flex-1 grid-rows-[minmax(9rem,1fr)_auto] gap-x-16 gap-y-8 pt-2 pb-6 lg:grid-cols-12 lg:grid-rows-none lg:items-center lg:py-12">
        <div className="lg:col-span-7">
          <p className="label text-muted">{t.login.kicker}</p>
          <h1 className="display mt-4 text-[clamp(4rem,17vw,9.5rem)]">{t.login.title}</h1>
          <p className="mt-5 max-w-[44ch] text-[1.0625rem] leading-relaxed text-muted">{t.login.lead}</p>
          <div className="mt-9 max-w-[420px]">
            <LoginForm />
          </div>
        </div>

        {/* The studio, with the thin outline of its ceiling light set behind the frame. */}
        <div aria-hidden className="relative order-first lg:order-none lg:col-span-5 lg:w-full lg:max-w-[420px] lg:justify-self-end">
          <span className="absolute -top-5 -right-5 bottom-5 left-5 hidden rounded-frame border border-line-strong lg:block" />
          <div className="relative h-full overflow-hidden rounded-frame bg-sunken lg:aspect-[4/5] lg:h-auto">
            <Image
              src="/media/reels/DZZ1izDo0ZQ.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 420px, 100vw"
              className="object-cover object-[50%_22%]"
            />
          </div>
        </div>
      </div>

      <Link
        href={`/${locale}`}
        className="inline-flex h-11 w-fit items-center gap-2 text-[0.9375rem] font-medium text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft size={18} />
        {t.login.back}
      </Link>
    </main>
  );
}
