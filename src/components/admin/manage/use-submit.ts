"use client";
import { useState, useTransition, type FormEvent } from "react";
import type { ActionResult } from "@/lib/admin/actions";

/**
 * Runs a server action from a form's submit event. Unlike `<form action>`,
 * React does not reset the form afterwards, so what was typed survives a
 * failed save and controlled switches stay in step with their state.
 */
export function useSubmit(run: (formData: FormData) => Promise<ActionResult>) {
  const [state, setState] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      setState(await run(formData));
    });
  };

  return { state, pending, onSubmit };
}
