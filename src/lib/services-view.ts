import type { Service } from "@/db/schema";
import { tr, type Locale } from "@/i18n/config";

export type ServiceCategory = Service["category"];
export const categories: ServiceCategory[] = ["hair", "beard", "color"];

export type ServiceView = {
  slug: string;
  category: ServiceCategory;
  name: string;
  description: string;
  price: number;
  duration: number;
  /** Picture shown beside the price list, chosen in the admin. */
  image: string | null;
};

export const toServiceView = (s: Service, locale: Locale): ServiceView => ({
  slug: s.slug,
  category: s.category,
  name: tr(locale, s.nameRo, s.nameRu),
  description: tr(locale, s.descriptionRo, s.descriptionRu),
  price: s.price,
  duration: s.durationMin,
  image: s.image,
});

export function groupServices(services: ServiceView[]) {
  return categories
    .map((key) => ({ key, items: services.filter((s) => s.category === key) }))
    .filter((g) => g.items.length > 0);
}
