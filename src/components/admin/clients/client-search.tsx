"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { inputClass } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { cn } from "@/lib/cn";

/** Search box that keeps the query in the URL, so results survive reloads and can be shared. */
export function ClientSearch({ basePath, query, sort }: { basePath: string; query: string; sort: string }) {
  const { t } = useAdminI18n();
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const push = (next: string) => {
    const params = new URLSearchParams();
    if (next.trim()) params.set("q", next.trim());
    if (sort !== "last") params.set("sort", sort);
    const qs = params.toString();
    start(() => router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false }));
  };

  const change = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 280);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div role="search" className="relative w-full max-w-md">
      <MagnifyingGlass
        size={20}
        className={cn("pointer-events-none absolute inset-y-0 left-3.5 my-auto text-muted", pending && "animate-pulse")}
      />
      <input
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => change(e.target.value)}
        placeholder={t.clients.search}
        aria-label={t.clients.search}
        className={cn(inputClass, "h-12 pr-12 pl-11 [&::-webkit-search-cancel-button]:hidden")}
      />
      {value && (
        <button
          type="button"
          onClick={() => change("")}
          aria-label={t.clients.clear}
          className="absolute inset-y-0 right-1 my-auto inline-flex size-10 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:text-fg"
        >
          <X size={18} weight="bold" />
        </button>
      )}
    </div>
  );
}
