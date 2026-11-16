"use client";
import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useAdminI18n } from "@/i18n/client";

/** Delete in two taps: the first asks, the second does it. */
export function ConfirmDelete({
  question,
  onConfirm,
  pending,
  size = "md",
}: {
  question: string;
  onConfirm: () => void;
  pending?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useAdminI18n();
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button variant="ghost" size={size} className="text-danger hover:bg-danger-soft" onClick={() => setAsking(true)}>
        <Trash size={18} />
        {t.common.delete}
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="mr-1 text-sm font-semibold">{question}</p>
      <Button variant="danger" size="sm" disabled={pending} onClick={onConfirm}>
        {t.common.delete}
      </Button>
      <Button variant="soft" size="sm" onClick={() => setAsking(false)}>
        {t.common.cancel}
      </Button>
    </div>
  );
}
