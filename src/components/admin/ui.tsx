import type { ReactNode } from "react";
import type { BookingStatus } from "@/db/schema";
import { cn } from "@/lib/cn";

/** Title row at the top of every admin screen; actions sit on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:mb-8">
      <div className="min-w-0">
        <h1 className="display text-[2.75rem] lg:text-[3.5rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-[60ch] text-[0.9375rem] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Bordered surface that groups one block of admin content. */
export function Panel({
  title,
  action,
  children,
  className,
  flush,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Drop the inner padding, for tables and lists that run edge to edge. */
  flush?: boolean;
}) {
  return (
    <section className={cn("rounded-frame border border-line bg-surface", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={flush ? undefined : "p-5"}>{children}</div>
    </section>
  );
}

const statusStyle: Record<BookingStatus, string> = {
  confirmed: "bg-accent-soft text-accent-text",
  completed: "bg-ok-soft text-ok",
  cancelled: "bg-fg/7 text-muted",
  no_show: "bg-danger-soft text-danger",
};

export function StatusPill({ status, label, className }: { status: BookingStatus; label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        statusStyle[status],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Composed empty state: says what is missing and offers the way to fill it. */
export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 px-6 py-14 text-center">
      <p className="display text-[1.75rem]">{title}</p>
      {body ? <p className="max-w-[42ch] text-[0.9375rem] text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
