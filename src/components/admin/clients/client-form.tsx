"use client";
import { useActionState, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { updateClient, type ActionResult } from "@/lib/admin/actions";

export function ClientForm({ client }: { client: { id: number; name: string; phone: string; notes: string } }) {
  const { t } = useAdminI18n();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateClient, null);
  // Controlled, so a rejected save keeps what was typed instead of resetting the form.
  const [values, setValues] = useState({ name: client.name, phone: client.phone, notes: client.notes });
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const failed = state && !state.ok ? state.error : null;
  const phoneError =
    failed === "invalidPhone" ? t.clients.phoneInvalid : failed === "phoneTaken" ? t.clients.phoneTaken : null;

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="id" value={client.id} />
      <Field label={t.clients.name} htmlFor="client-name">
        <Input id="client-name" name="name" value={values.name} onChange={set("name")} required maxLength={120} autoComplete="off" />
      </Field>
      <Field label={t.clients.phone} htmlFor="client-phone" error={phoneError}>
        <Input
          id="client-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={values.phone}
          onChange={set("phone")}
          required
          minLength={5}
          autoComplete="off"
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={phoneError ? "client-phone-error" : undefined}
          className="tnum"
        />
      </Field>
      <Field label={t.clients.notes} htmlFor="client-notes" hint={t.clients.notesHint}>
        <Textarea
          id="client-notes"
          name="notes"
          value={values.notes}
          onChange={set("notes")}
          maxLength={4000}
          rows={5}
          aria-describedby="client-notes-hint"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
        <p aria-live="polite" className="text-sm">
          {!pending && state?.ok ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-ok">
              <CheckCircle size={18} weight="fill" />
              {t.common.saved}
            </span>
          ) : !pending && failed && !phoneError ? (
            <span className="text-danger">{t.common.error}</span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
