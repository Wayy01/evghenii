"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { gsap, MOTION_OK } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { IconButton } from "./button";

const DESKTOP_SHEET = "(min-width: 768px)";

/**
 * Modal surface: slides up from the bottom edge on phones, in from the right
 * on wider screens. Built on <dialog>, so focus trapping and Esc come free.
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current!;
    const animate = window.matchMedia(MOTION_OK).matches;
    const from = window.matchMedia(DESKTOP_SHEET).matches ? { xPercent: 100 } : { yPercent: 100 };

    if (open && !dialog.open) {
      dialog.showModal();
      // Start focus on the surface itself, so opening by touch does not ring the close button.
      dialog.focus();
      if (animate) {
        gsap.fromTo(dialog, from, { xPercent: 0, yPercent: 0, duration: 0.55, clearProps: "transform" });
      }
    } else if (!open && dialog.open) {
      if (animate) {
        gsap.to(dialog, { ...from, duration: 0.3, ease: "power3.in", onComplete: () => dialog.close() });
      } else {
        dialog.close();
      }
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      tabIndex={-1}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-sheet bg-surface p-0 text-fg outline-none shadow-[0_-12px_60px_rgb(0_0_0/0.22)] backdrop:bg-night/55 backdrop:backdrop-blur-[2px] open:flex open:flex-col md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:max-h-none md:w-[480px] md:rounded-none md:rounded-l-sheet",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line py-3 pr-3 pl-5">
        <h2 className="display text-[1.75rem]">{title}</h2>
        <IconButton label={closeLabel} onClick={onClose}>
          <X size={22} weight="bold" />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      {footer ? (
        <footer className="shrink-0 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</footer>
      ) : null}
    </dialog>
  );
}
