"use client";
import { useState, useTransition } from "react";
import { Check, UserMinus } from "@phosphor-icons/react";
import { useAdminI18n } from "@/i18n/client";
import { setBookingStatus } from "@/lib/admin/actions";

const action =
  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-[background-color,scale] duration-200 active:scale-[0.96] disabled:opacity-50";

/** Closes out an appointment whose time has passed, straight from today's list. */
export function StatusActions({ bookingId }: { bookingId: number }) {
  const { t } = useAdminI18n();
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);

  const set = (status: "completed" | "no_show") =>
    start(async () => {
      const result = await setBookingStatus(bookingId, status);
      setFailed(!result.ok);
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" disabled={pending} onClick={() => set("completed")} className={`${action} bg-ok-soft text-ok hover:bg-ok/20`}>
        <Check size={16} weight="bold" />
        {t.overview.markDone}
      </button>
      <button type="button" disabled={pending} onClick={() => set("no_show")} className={`${action} bg-fg/7 text-fg hover:bg-fg/12`}>
        <UserMinus size={16} />
        {t.overview.markNoShow}
      </button>
      {failed && (
        <p role="alert" className="w-full text-sm text-danger">
          {t.common.error}
        </p>
      )}
    </div>
  );
}
