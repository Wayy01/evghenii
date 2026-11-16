import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

/** Closing panel that turns a finished page into a booking. */
export function BookPrompt({
  title,
  body,
  cta,
  href,
}: {
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <section className="page pb-20 lg:pb-28">
      <Reveal>
        <div className="rounded-frame bg-inverse px-6 py-12 text-on-inverse md:px-12 md:py-16 lg:flex lg:items-end lg:justify-between lg:gap-12 lg:px-16 lg:py-20">
          <div>
            <h2 className="display text-[clamp(3.25rem,11vw,7rem)]">{title}</h2>
            <p className="mt-4 max-w-[38ch] text-lg text-on-inverse-muted">{body}</p>
          </div>
          <ButtonLink href={href} size="lg" className="group mt-8 lg:mt-0">
            {cta}
            <ArrowRight
              size={20}
              weight="bold"
              className="transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
            />
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
