"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowLineLeft, ArrowRight, DotsSixVertical } from "@phosphor-icons/react";
import { Button, IconButton } from "@/components/ui/button";
import { useAdminI18n } from "@/i18n/client";
import { fmt, tr } from "@/i18n/config";
import { reorderMedia } from "@/lib/admin/cms-actions";
import { cn } from "@/lib/cn";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { SaveStatus } from "./controls";
import type { MediaItem } from "./media-manager";

type Slot = { x: number; y: number; w: number; h: number };

type Drag = {
  id: number;
  from: number;
  to: number;
  /** Pointer and page scroll at pick-up; the tile follows the difference. */
  startX: number;
  startY: number;
  startScroll: number;
  x: number;
  y: number;
  /** Where each position sits on the page, measured once at pick-up. */
  slots: Slot[];
  frame: number;
};

const SETTLE = 0.24;
/** Distance from the viewport edge at which a held tile starts scrolling the page. */
const EDGE_TOP = 96;
const EDGE_BOTTOM = 168;

const sameOrder = (a: MediaItem[], b: MediaItem[]) => a.length === b.length && a.every((m, i) => m.id === b[i].id);

/** Where the tile that started at `index` sits while the dragged one hovers over `to`. */
const shifted = (index: number, from: number, to: number) =>
  index > from && index <= to ? index - 1 : index < from && index >= to ? index + 1 : index;

/**
 * Arrange mode: drag a tile (grip on touch, anywhere on the picture with a
 * mouse) or use its buttons, then save. Nothing is stored until Save.
 */
export function MediaOrder({
  media,
  onCancel,
  onSaved,
}: {
  media: MediaItem[];
  onCancel: () => void;
  onSaved: (ids: number[]) => void;
}) {
  const { locale, t } = useAdminI18n();
  const [order, setOrder] = useState(media);
  const [dragId, setDragId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tiles = useRef(new Map<number, HTMLDivElement>());
  const orderRef = useRef(order);
  const drag = useRef<Drag | null>(null);
  /** Tile boxes captured just before a button move, so the change can be animated. */
  const flipFrom = useRef<Map<number, DOMRect> | null>(null);
  const focusAfter = useRef<{ id: number; control: string } | null>(null);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  const motionOk = () => window.matchMedia(MOTION_OK).matches;
  const captionOf = useCallback(
    (item: MediaItem) => tr(locale, item.captionRo, item.captionRu) || t.content.noCaption,
    [locale, t.content.noCaption],
  );
  const announce = useCallback(
    (item: MediaItem, index: number, total: number) =>
      setMessage(`${captionOf(item)}: ${fmt(t.content.position, { n: index + 1, total })}`),
    [captionOf, t.content.position],
  );

  // After every reorder the DOM is already in its new order: either animate the
  // tiles from where they were (button move) or drop the drag offsets (drop).
  useLayoutEffect(() => {
    const els = [...tiles.current.values()];
    const before = flipFrom.current;
    flipFrom.current = null;
    gsap.killTweensOf(els);
    gsap.set(els, { clearProps: "transform,zIndex" });
    if (before && motionOk()) {
      tiles.current.forEach((el, id) => {
        const old = before.get(id);
        if (!old) return;
        const now = el.getBoundingClientRect();
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (dx || dy) gsap.fromTo(el, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.45, clearProps: "transform" });
      });
    }
    const focus = focusAfter.current;
    focusAfter.current = null;
    if (focus) {
      const tile = tiles.current.get(focus.id);
      const wanted = tile?.querySelector<HTMLButtonElement>(`[data-control="${focus.control}"]:not(:disabled)`);
      (wanted ?? tile?.querySelector<HTMLButtonElement>("[data-control]:not(:disabled)"))?.focus();
    }
  }, [order]);

  const moveTo = (id: number, target: number, control: string) => {
    const current = orderRef.current;
    const from = current.findIndex((m) => m.id === id);
    const to = Math.max(0, Math.min(current.length - 1, target));
    if (from < 0 || from === to || drag.current) return;
    flipFrom.current = new Map([...tiles.current].map(([key, el]) => [key, el.getBoundingClientRect()]));
    focusAfter.current = { id, control };
    const next = [...current];
    next.splice(to, 0, ...next.splice(from, 1));
    setError(null);
    setOrder(next);
    announce(next[to], to, next.length);
  };

  // ------------------------------------------------------------------ drag

  /** Moves every other tile to the position it would take if the drag ended now. */
  const shiftOthers = (state: Drag, duration: number) => {
    orderRef.current.forEach((item, index) => {
      if (index === state.from) return;
      const el = tiles.current.get(item.id);
      if (!el) return;
      const slot = state.slots[shifted(index, state.from, state.to)];
      const home = state.slots[index];
      gsap.to(el, {
        x: slot.x - home.x,
        y: slot.y - home.y,
        duration,
        ease: "power3.out",
        overwrite: true,
      });
    });
  };

  const follow = () => {
    const state = drag.current;
    if (!state) return;
    const el = tiles.current.get(state.id);
    if (!el) return;
    const dx = state.x - state.startX;
    const dy = state.y - state.startY + (window.scrollY - state.startScroll);
    gsap.set(el, { x: dx, y: dy });

    const home = state.slots[state.from];
    const cx = home.x + home.w / 2 + dx;
    const cy = home.y + home.h / 2 + dy;
    let nearest = state.to;
    let best = Infinity;
    state.slots.forEach((slot, index) => {
      const distance = Math.hypot(slot.x + slot.w / 2 - cx, slot.y + slot.h / 2 - cy);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    if (nearest !== state.to) {
      state.to = nearest;
      shiftOthers(state, motionOk() ? 0.3 : 0);
    }
  };

  // Stable handlers so they can be added to and removed from `window`.
  const handlers = useRef<{
    follow: () => void;
    finish: (commit: boolean) => void;
  } | null>(null);
  const onPointerMove = useCallback((e: PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    state.x = e.clientX;
    state.y = e.clientY;
    handlers.current?.follow();
  }, []);
  const onPointerUp = useCallback(() => handlers.current?.finish(true), []);
  const onPointerCancel = useCallback(() => handlers.current?.finish(false), []);
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") handlers.current?.finish(false);
  }, []);

  /** Ends the pointer session: no more listeners, no more edge scrolling. */
  const release = useCallback(() => {
    const state = drag.current;
    drag.current = null;
    if (state) cancelAnimationFrame(state.frame);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("keydown", onKeyDown);
  }, [onPointerMove, onPointerUp, onPointerCancel, onKeyDown]);
  useEffect(() => release, [release]);

  const finish = (commit: boolean) => {
    const state = drag.current;
    if (!state) return;
    release();

    if (!commit) state.to = state.from;
    const el = tiles.current.get(state.id);
    const settle = () => {
      setDragId(null);
      if (state.to === state.from) {
        gsap.set([...tiles.current.values()], {
          clearProps: "transform,zIndex",
        });
        return;
      }
      const next = [...orderRef.current];
      next.splice(state.to, 0, ...next.splice(state.from, 1));
      setError(null);
      setOrder(next);
      announce(next[state.to], state.to, next.length);
    };

    const duration = motionOk() ? SETTLE : 0;
    shiftOthers(state, duration);
    if (!el || duration === 0) {
      settle();
      return;
    }
    const slot = state.slots[state.to];
    const home = state.slots[state.from];
    gsap.to(el, {
      x: slot.x - home.x,
      y: slot.y - home.y,
      scale: 1,
      duration,
      ease: "power3.out",
      overwrite: true,
      onComplete: settle,
    });
  };

  useEffect(() => {
    handlers.current = { follow, finish };
  });

  const begin = (e: ReactPointerEvent, id: number) => {
    if (drag.current || pending || e.button !== 0) return;
    e.preventDefault();
    const current = orderRef.current;
    const from = current.findIndex((m) => m.id === id);
    const el = tiles.current.get(id);
    if (from < 0 || !el) return;

    // Any button-move animation still running would skew the measurement.
    const els = [...tiles.current.values()];
    gsap.killTweensOf(els);
    gsap.set(els, { clearProps: "transform" });
    const slots = current.map((item) => {
      const box = tiles.current.get(item.id)!.getBoundingClientRect();
      return {
        x: box.left + window.scrollX,
        y: box.top + window.scrollY,
        w: box.width,
        h: box.height,
      };
    });

    const state: Drag = {
      id,
      from,
      to: from,
      startX: e.clientX,
      startY: e.clientY,
      startScroll: window.scrollY,
      x: e.clientX,
      y: e.clientY,
      slots,
      frame: 0,
    };
    drag.current = state;
    setDragId(id);
    gsap.set(el, { zIndex: 20 });
    if (motionOk()) gsap.to(el, { scale: 1.04, duration: 0.2, ease: "power2.out" });

    // Holding a tile near the top or bottom edge scrolls the page under it.
    const tick = () => {
      if (drag.current !== state) return;
      const fromBottom = window.innerHeight - state.y;
      const speed =
        state.y < EDGE_TOP
          ? -Math.ceil((EDGE_TOP - state.y) / 6)
          : fromBottom < EDGE_BOTTOM
            ? Math.ceil((EDGE_BOTTOM - fromBottom) / 8)
            : 0;
      if (speed !== 0) {
        const before = window.scrollY;
        window.scrollBy(0, Math.max(-18, Math.min(18, speed)));
        if (window.scrollY !== before) handlers.current?.follow();
      }
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
  };

  const onGripKey = (e: ReactKeyboardEvent, id: number, index: number) => {
    const target =
      e.key === "ArrowLeft" || e.key === "ArrowUp"
        ? index - 1
        : e.key === "ArrowRight" || e.key === "ArrowDown"
          ? index + 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? order.length - 1
              : null;
    if (target === null) return;
    e.preventDefault();
    moveTo(id, target, "grip");
  };

  // ------------------------------------------------------------------ save

  const dirty = !sameOrder(order, media);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const ids = order.map((m) => m.id);
      const result = await reorderMedia(ids).catch(() => null);
      if (!result?.ok) {
        setError(t.common.error);
        return;
      }
      onSaved(ids);
    });

  return (
    <div className="grid gap-6">
      <p className="max-w-[70ch] text-[0.9375rem] leading-relaxed text-muted">{t.content.arrangeHint}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 select-none sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {order.map((item, index) => {
          const still = item.kind === "photo" ? item.src : item.poster;
          const caption = captionOf(item);
          const dragging = dragId === item.id;
          return (
            <div
              key={item.id}
              ref={(el) => {
                if (el) tiles.current.set(item.id, el);
                else tiles.current.delete(item.id);
              }}
              className="relative min-w-0"
            >
              <div
                onPointerDown={(e) => e.pointerType === "mouse" && begin(e, item.id)}
                className={cn(
                  "relative aspect-[9/16] overflow-hidden rounded-frame bg-sunken outline-2 outline-offset-2",
                  dragging
                    ? "cursor-grabbing shadow-[0_18px_50px_rgb(0_0_0/0.35)] outline-accent"
                    : "cursor-grab outline-transparent",
                )}
              >
                {still ? (
                  <Image
                    src={still}
                    alt=""
                    fill
                    draggable={false}
                    sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 46vw"
                    className={cn("pointer-events-none object-cover", !item.published && "opacity-45 grayscale")}
                  />
                ) : (
                  <video
                    src={`${item.src}#t=0.1`}
                    muted
                    playsInline
                    preload="metadata"
                    className={cn(
                      "pointer-events-none size-full object-cover",
                      !item.published && "opacity-45 grayscale",
                    )}
                  />
                )}
                <span className="tnum absolute top-2 left-2 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-night/70 px-2.5 text-[0.9375rem] font-semibold text-on-night backdrop-blur-md">
                  {index + 1}
                </span>
                <button
                  type="button"
                  data-control="grip"
                  aria-label={`${t.content.drag}: ${caption}`}
                  title={t.content.drag}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    begin(e, item.id);
                  }}
                  onKeyDown={(e) => onGripKey(e, item.id, index)}
                  // Inline: the global tap rule for buttons would outrank a utility class, and the
                  // browser would then take the gesture for scrolling and cancel the drag.
                  style={{ touchAction: "none" }}
                  className={cn(
                    "absolute top-1.5 right-1.5 inline-flex size-11 items-center justify-center rounded-full text-on-night backdrop-blur-md",
                    dragging ? "cursor-grabbing bg-accent" : "cursor-grab bg-night/70",
                  )}
                >
                  <DotsSixVertical size={22} weight="bold" />
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <IconButton
                  data-control="first"
                  label={t.content.moveFirst}
                  disabled={index === 0}
                  onClick={() => moveTo(item.id, 0, "first")}
                  className="-ml-2"
                >
                  <ArrowLineLeft size={20} />
                </IconButton>
                <span className="flex">
                  <IconButton
                    data-control="earlier"
                    label={t.content.moveEarlier}
                    disabled={index === 0}
                    onClick={() => moveTo(item.id, index - 1, "earlier")}
                  >
                    <ArrowLeft size={20} />
                  </IconButton>
                  <IconButton
                    data-control="later"
                    label={t.content.moveLater}
                    disabled={index === order.length - 1}
                    onClick={() => moveTo(item.id, index + 1, "later")}
                    className="-mr-2"
                  >
                    <ArrowRight size={20} />
                  </IconButton>
                </span>
              </div>

              <p className={cn("truncate text-sm leading-snug font-medium", !caption && "text-faint")}>{caption}</p>
              <p className="mt-1 min-h-4 truncate text-xs font-semibold">
                {item.featured ? (
                  <span className="text-accent-text">{t.content.featured}</span>
                ) : !item.published ? (
                  <span className="text-muted">{t.content.hidden}</span>
                ) : null}
              </p>
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {message}
      </p>

      {/* Sticks above the phone tab bar so saving is always one tap away. */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[28px] border border-line bg-surface/95 py-2 pr-2 pl-5 shadow-[0_10px_40px_rgb(0_0_0/0.14)] backdrop-blur-md lg:bottom-5">
        <SaveStatus
          pending={pending}
          ok={false}
          error={error}
          labels={{ saving: t.common.saving, saved: t.common.saved }}
          className="flex-1"
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button onClick={save} disabled={pending || !dirty}>
            {t.content.saveOrder}
          </Button>
        </div>
      </div>
    </div>
  );
}
