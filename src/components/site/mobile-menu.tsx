"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { InstagramLogo, MapPin, Phone, TiktokLogo, X } from "@phosphor-icons/react";
import { buttonClass, IconButton } from "@/components/ui/button";
import { gsap, MOTION_OK, useGSAP } from "@/lib/gsap";

type Props = {
  links: { href: string; label: string }[];
  bookHref: string;
  labels: { menu: string; close: string; book: string };
  contact: {
    phone: string;
    phoneHref: string;
    address: string;
    mapsUrl: string;
    instagram: string;
    tiktok: string;
  };
  wordmark: ReactNode;
  localeSwitch: ReactNode;
};

export function MobileMenu({ links, bookHref, labels, contact, wordmark, localeSwitch }: Props) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useGSAP(
    () => {
      const el = panel.current!;
      if (!open) {
        if (wasOpen.current) gsap.to(el, { autoAlpha: 0, duration: 0.25, ease: "power2.out" });
        return;
      }
      gsap.set(el, { autoAlpha: 1 });
      if (!window.matchMedia(MOTION_OK).matches) return;
      gsap
        .timeline()
        .fromTo(
          el,
          { clipPath: "inset(0 0 100% 0)" },
          { clipPath: "inset(0 0 0% 0)", duration: 0.65, ease: "expo.inOut" },
        )
        .from("[data-menu-link]", { yPercent: 115, duration: 0.8, stagger: 0.06 }, "-=0.3")
        .from("[data-menu-meta]", { autoAlpha: 0, y: 14, duration: 0.6, stagger: 0.05 }, "-=0.55");
    },
    { dependencies: [open], scope: panel },
  );

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) trigger.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    closeButton.current?.focus();
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen(true)}
        className="-mr-2 inline-flex h-11 items-center gap-2.5 rounded-full px-3 text-sm font-semibold active:scale-[0.97]"
      >
        {labels.menu}
        <span aria-hidden className="grid w-5 gap-[5px]">
          <span className="h-0.5 w-full bg-fg" />
          <span className="h-0.5 w-full bg-fg" />
        </span>
      </button>

      <div
        ref={panel}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label={labels.menu}
        inert={!open}
        className="invisible fixed inset-0 z-(--z-sheet) flex flex-col overflow-y-auto bg-bg opacity-0"
      >
        <div className="page flex h-16 shrink-0 items-center justify-between">
          <span onClick={close}>{wordmark}</span>
          <IconButton ref={closeButton} label={labels.close} onClick={close} className="-mr-2">
            <X size={24} weight="bold" />
          </IconButton>
        </div>

        <nav className="page flex flex-1 flex-col justify-center gap-1 py-6">
          {links.map((link) => (
            <span key={link.href} className="block overflow-hidden py-1">
              <Link
                data-menu-link
                href={link.href}
                onClick={close}
                className="display block text-[clamp(3.5rem,17vw,6rem)]"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="page grid gap-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Wrapped: GSAP must not tween an element that carries its own CSS opacity transition. */}
          <div data-menu-meta>
            <Link href={bookHref} onClick={close} className={buttonClass({ size: "lg" }, "w-full")}>
              {labels.book}
            </Link>
          </div>
          <div data-menu-meta className="grid gap-3 text-[0.9375rem]">
            <a href={contact.phoneHref} className="flex items-center gap-3">
              <Phone size={20} className="text-muted" />
              {contact.phone}
            </a>
            <a href={contact.mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3">
              <MapPin size={20} className="text-muted" />
              {contact.address}
            </a>
          </div>
          <div data-menu-meta className="flex items-center justify-between border-t border-line pt-4">
            <div className="-ml-2.5 flex">
{contact.instagram ? (
              <a
                href={contact.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="inline-flex size-11 items-center justify-center"
              >
                <InstagramLogo size={24} />
              </a>
) : null}
{contact.tiktok ? (
              <a
                href={contact.tiktok}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
                className="inline-flex size-11 items-center justify-center"
              >
                <TiktokLogo size={24} />
              </a>
) : null}
            </div>
            <span onClick={close}>{localeSwitch}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
