import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "block w-full rounded-field border border-line-strong bg-surface px-3.5 text-base text-fg placeholder:text-faint transition-[border-color,box-shadow] duration-150 hover:border-fg/50 focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent-soft disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus:ring-danger-soft";

/** Label above, control in the middle, hint or error below. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3 text-sm font-semibold text-fg">
        {label}
        {optional ? <span className="font-normal text-muted">{optional}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, "h-12", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-28 resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "h-12 appearance-none pr-9", className)} {...props} />;
}
