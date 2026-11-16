import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The appointment drawn as a paper ticket: details on the stub, the price and
 * the action below a perforation. Used by the flow and the confirmation page.
 */
export function Ticket({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-frame border border-line bg-surface", className)}>
      <div className="p-5 sm:p-6">{children}</div>
      {footer ? (
        <>
          <div aria-hidden className="relative mx-5 border-t border-dashed border-line-strong sm:mx-6">
            <span className="absolute top-0 -left-5 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-bg sm:-left-6" />
            <span className="absolute top-0 -right-5 size-5 translate-x-1/2 -translate-y-1/2 rounded-full border border-line bg-bg sm:-right-6" />
          </div>
          <div className="p-5 sm:p-6">{footer}</div>
        </>
      ) : null}
    </section>
  );
}

/** One labelled line of the ticket; `action` sits at the right edge. */
export function TicketRow({
  label,
  children,
  action,
  muted,
}: {
  label: string;
  children: ReactNode;
  action?: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <dt className="label text-muted">{label}</dt>
        <dd className={cn("mt-1.5 text-[1.0625rem] leading-snug font-semibold text-pretty", muted && "font-normal text-faint")}>
          {children}
        </dd>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
