"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSiteI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { cancelBooking } from "@/lib/booking-actions";

/** Two taps to cancel: the first asks, the second does it. */
export function CancelBooking({ token }: { token: string }) {
  const { t, site } = useSiteI18n();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<"tooLate" | "failed" | null>(null);
  const [pending, startTransition] = useTransition();

  if (failure === "tooLate") {
    const [before, after] = t.booking.tooLate.split("{phone}");
    return (
      <p role="alert" className="text-[0.9375rem] text-muted">
        {before}
        <a href={site.phoneHref} className="tnum font-semibold whitespace-nowrap text-accent-text underline underline-offset-3">
          {site.phoneDisplay}
        </a>
        {after}
      </p>
    );
  }

  if (!confirming) {
    return (
      <>
        <Button variant="danger" onClick={() => setConfirming(true)} className="w-full">
          {t.booking.cancel}
        </Button>
        <p className="mt-3 text-sm text-muted">{t.booking.policy}</p>
      </>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby="cancel-question">
      <p id="cancel-question" className="text-[1.0625rem] font-semibold">
        {t.booking.cancelConfirm}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending} autoFocus>
          {t.booking.cancelNo}
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelBooking(token);
              if (result.ok || result.reason === "notFound") {
                // Already cancelled elsewhere counts as done; the page reloads into its real state.
                router.refresh();
                return;
              }
              setFailure(result.reason === "tooLate" ? "tooLate" : "failed");
            })
          }
        >
          {pending ? t.booking.cancelling : t.booking.cancelYes}
        </Button>
      </div>
      {failure === "failed" && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {t.booking.failed}
        </p>
      )}
    </div>
  );
}
