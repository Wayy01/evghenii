import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,border-color,opacity,scale] duration-200 ease-out-expo active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100";

const variants = {
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  ink: "bg-fg text-bg hover:opacity-85",
  outline: "border border-line-strong text-fg hover:border-fg",
  soft: "bg-fg/7 text-fg hover:bg-fg/12",
  ghost: "text-fg hover:bg-fg/7",
  danger: "bg-danger-soft text-danger hover:bg-danger/20",
} as const;

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-[0.9375rem]",
  lg: "h-14 px-7 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

type Style = { variant?: ButtonVariant; size?: ButtonSize };

export const buttonClass = ({ variant = "accent", size = "md" }: Style = {}, className?: string) =>
  cn(base, variants[variant], sizes[size], className);

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & Style) {
  return <button type={type} className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & Style) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}

/** Square-ish icon control with a 44px touch target. */
export function IconButton({
  label,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg transition-[background-color,scale,opacity] duration-200 ease-out-expo hover:bg-fg/7 active:scale-[0.94] disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}
