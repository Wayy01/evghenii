import type { BookingStatus } from "@/db/schema";

/**
 * Status colours for calendar blocks. Fills are mixed into the surface colour
 * instead of being translucent, so the hour lines never show through a block.
 */
export const tone: Record<BookingStatus, { block: string; bar: string; meta: string }> = {
  confirmed: {
    block: "bg-[color-mix(in_srgb,var(--accent)_13%,var(--surface))] text-fg",
    bar: "bg-accent",
    meta: "text-accent-text",
  },
  completed: {
    block: "bg-[color-mix(in_srgb,var(--ok)_15%,var(--surface))] text-fg",
    bar: "bg-ok",
    meta: "text-ok",
  },
  no_show: {
    block: "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface))] text-fg",
    bar: "bg-danger",
    meta: "text-danger",
  },
  cancelled: {
    block: "border border-dashed border-line-strong bg-surface text-faint line-through",
    bar: "bg-transparent",
    meta: "text-faint",
  },
};

/** Diagonal hairlines over a sunken fill: time the chair is not available. */
export const hatch =
  "bg-sunken bg-[repeating-linear-gradient(135deg,transparent_0_7px,var(--line)_7px_8px)]";
