import { fmt, type Locale } from "@/i18n/config";
import type { SiteDict } from "@/i18n/dictionaries";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import type { ServiceView } from "@/lib/services-view";
import { groupServices } from "@/lib/services-view";
import { formatPrice } from "@/lib/time";
import { ServiceMenu, type MenuGroup } from "./service-menu";

export function Services({ locale, t, services }: { locale: Locale; t: SiteDict; services: ServiceView[] }) {
  const groups: MenuGroup[] = groupServices(services).map((group) => ({
    key: group.key,
    label: t.services.groups[group.key],
    items: group.items.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      duration: fmt(t.services.minutes, { n: s.duration }),
      price: formatPrice(s.price, locale),
      image: s.image,
      href: `/${locale}/book?service=${s.slug}`,
      label: fmt(t.services.choose, { name: s.name }),
    })),
  }));

  return (
    <section id="services" aria-labelledby="services-title" className="border-t border-line py-20 lg:py-36">
      <div className="page">
        <SplitHeading id="services-title" className="display text-[clamp(3.25rem,13vw,6.5rem)]">
          {t.services.title}
        </SplitHeading>
        <Reveal y={16} delay={0.1}>
          <p className="mt-4 max-w-[46ch] text-[1.0625rem] leading-relaxed text-muted">{t.services.lead}</p>
        </Reveal>
        <ServiceMenu groups={groups} note={t.services.note} />
      </div>
    </section>
  );
}
