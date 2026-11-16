"use client";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, DotsSixVertical, Trash } from "@phosphor-icons/react";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/** Moves one element of a list, returning a new array. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export type DragHandleProps = { onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void };

/**
 * A vertical list whose rows can be dragged into a new order with a mouse or a
 * finger. A row moves one place as soon as the pointer crosses the middle of
 * its neighbour, and the rows that changed place slide to where they landed.
 */
export function SortableList<T>({
  items,
  getKey,
  onMove,
  children,
  className,
  itemClassName,
}: {
  items: T[];
  getKey: (item: T) => string;
  onMove: (from: number, to: number) => void;
  children: (item: T, index: number, handle: DragHandleProps, dragging: boolean) => ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const keys = items.map(getKey);
  const live = useRef({ keys, onMove });
  const tops = useRef(new Map<string, number>());

  useEffect(() => {
    live.current = { keys, onMove };
  });

  // Slide rows from where they were to where the new order put them.
  useLayoutEffect(() => {
    const rows = Array.from(list.current?.children ?? []) as HTMLElement[];
    const animate = window.matchMedia(MOTION_OK).matches;
    const next = new Map<string, number>();
    for (const row of rows) {
      const key = row.dataset.sortKey!;
      next.set(key, row.offsetTop);
      const before = tops.current.get(key);
      if (animate && before != null && before !== row.offsetTop) {
        gsap.fromTo(
          row,
          { y: before - row.offsetTop },
          { y: 0, duration: 0.35, ease: "expo.out", overwrite: true, clearProps: "transform" },
        );
      }
    }
    tops.current = next;
  });

  // One handler for every row: the row a grip belongs to is the nearest list item around it.
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    const key = event.currentTarget.closest<HTMLElement>("li[data-sort-key]")?.dataset.sortKey;
    if (event.button !== 0 || !key) return;
    event.preventDefault();
    setDragging(key);
  };

  // While a row is held, follow the pointer anywhere on the page.
  useEffect(() => {
    if (!dragging) return;
    const move = (e: globalThis.PointerEvent) => {
      const rows = Array.from(list.current?.children ?? []) as HTMLElement[];
      const index = live.current.keys.indexOf(dragging);
      if (index < 0) return;
      const middle = (row: HTMLElement) => {
        const rect = row.getBoundingClientRect();
        return rect.top + rect.height / 2;
      };
      if (index > 0 && e.clientY < middle(rows[index - 1])) live.current.onMove(index, index - 1);
      else if (index < rows.length - 1 && e.clientY > middle(rows[index + 1])) live.current.onMove(index, index + 1);

      // Keep going when the pointer nears the top or bottom of the screen.
      if (e.clientY < 90) window.scrollBy(0, -14);
      else if (e.clientY > window.innerHeight - 130) window.scrollBy(0, 14);
    };
    const end = () => setDragging(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging]);

  return (
    <ul ref={list} className={cn(dragging && "cursor-grabbing select-none", className)}>
      {items.map((item, index) => {
        const key = keys[index];
        return (
          <li key={key} data-sort-key={key} className={cn("relative", key === dragging && "z-10", itemClassName)}>
            {children(item, index, { onPointerDown: start }, key === dragging)}
          </li>
        );
      })}
    </ul>
  );
}

const tool =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-fg/7 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted";

/** Grip for dragging a row; the up and down buttons do the same job from the keyboard. */
export function DragHandle({ handle, label, className }: { handle: DragHandleProps; label: string; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...handle}
      className={cn(tool, "cursor-grab touch-none active:cursor-grabbing", className)}
    >
      <DotsSixVertical size={20} weight="bold" />
    </button>
  );
}

export function MoveButtons({
  index,
  count,
  onMove,
  labels,
  vertical,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  labels: { up: string; down: string };
  vertical?: boolean;
}) {
  return (
    <span className={cn("inline-flex", vertical && "flex-col")}>
      <button
        type="button"
        aria-label={labels.up}
        title={labels.up}
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className={cn(tool, vertical && "h-7 sm:h-8")}
      >
        <ArrowUp size={16} weight="bold" />
      </button>
      <button
        type="button"
        aria-label={labels.down}
        title={labels.down}
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        className={cn(tool, vertical && "h-7 sm:h-8")}
      >
        <ArrowDown size={16} weight="bold" />
      </button>
    </span>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(tool, "hover:bg-danger-soft hover:text-danger")}
    >
      <Trash size={18} />
    </button>
  );
}
