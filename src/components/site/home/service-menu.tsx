"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type MenuRow = {
  slug: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  image: string | null;
  href: string;
  label: string;
};
export type MenuGroup = { key: string; label: string; items: MenuRow[] };

/**
 * Price list where every row books that service. On wide screens a pinned
 * frame shows the kind of work behind the row under the pointer.
 */
export function ServiceMenu({ groups, note }: { groups: MenuGroup[]; note: string }) {
  const rows = groups.flatMap((g) => g.items);
  const [active, setActive] = useState(rows[0]?.slug);

  return (
    <div className="mt-10 grid gap-x-16 lg:mt-16 lg:grid-cols-12">
      <div className="hidden lg:col-span-4 lg:block">
        <div className="sticky top-28 aspect-[4/5] overflow-hidden rounded-frame bg-sunken">
          {rows.map((row) =>
            row.image ? (
            <Image
              key={row.slug}
              src={row.image}
              alt=""
              fill
              sizes="30vw"
              className={cn(
                "object-cover transition-[opacity,scale] duration-700 ease-out-expo",
                row.slug === active ? "scale-100 opacity-100" : "scale-105 opacity-0",
              )}
            />
            ) : null,
          )}
        </div>
      </div>

      <div className="grid gap-10 lg:col-span-8 lg:gap-14">
        {groups.map((group) => (
          <div key={group.key}>
            <h3 className="label pb-3 text-muted">{group.label}</h3>
            <ul>
              {group.items.map((row) => (
                <li key={row.slug}>
                  <Link
                    href={row.href}
                    aria-label={row.label}
                    onPointerEnter={() => setActive(row.slug)}
                    onFocus={() => setActive(row.slug)}
                    className="group grid grid-cols-[1fr_auto] items-center gap-x-5 border-t border-line py-5 lg:gap-x-8 lg:py-7"
                  >
                    <span className="min-w-0">
                      <span className="display block text-[2.125rem] transition-transform duration-500 ease-out-expo lg:text-[3.5rem] lg:group-hover:translate-x-3">
                        {row.name}
                      </span>
                      <span className="mt-2 block max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">
                        {row.description}
                      </span>
                    </span>
                    <span className="flex items-center gap-6 text-right">
                      <span>
                        <span className="tnum block text-lg font-semibold whitespace-nowrap lg:text-xl">{row.price}</span>
                        <span className="tnum mt-0.5 flex items-center justify-end gap-1.5 text-sm whitespace-nowrap text-muted">
                          {row.duration}
                          <ArrowRight size={14} weight="bold" className="text-accent-text lg:hidden" />
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="hidden size-12 items-center justify-center rounded-full border border-line-strong transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent lg:inline-flex"
                      >
                        <ArrowRight size={20} weight="bold" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-sm text-muted">{note}</p>
      </div>
    </div>
  );
}
