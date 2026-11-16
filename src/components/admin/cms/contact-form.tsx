"use client";
import { useState, useTransition } from "react";
import { Field, Input } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { saveConfig } from "@/lib/admin/cms-actions";
import { contactSchema, type ContactConfig } from "@/lib/site-config";
import { SaveBar, useUnsavedWarning } from "./parts";

type FieldKey = "phone" | "addressRo" | "addressRu" | "mapsUrl" | "instagram" | "tiktok";

const clean = (c: ContactConfig): ContactConfig => ({
  phone: c.phone.trim(),
  address: { ro: c.address.ro.trim(), ru: c.address.ru.trim() },
  mapsUrl: c.mapsUrl.trim(),
  instagram: c.instagram.trim(),
  tiktok: c.tiktok.trim(),
});

export function ContactForm({ contact }: { contact: ContactConfig }) {
  const { t } = useAdminI18n();
  const s = t.site;
  const [values, setValues] = useState(contact);
  const [base, setBase] = useState(() => clean(contact));
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const next = clean(values);
  const dirty = JSON.stringify(next) !== JSON.stringify(base);
  useUnsavedWarning(dirty);

  const set = (change: Partial<ContactConfig>) => {
    setValues((v) => ({ ...v, ...change }));
    setSaved(false);
    setError(null);
  };

  const save = () => {
    // Same rules as the server, turned into a message under each field.
    const found: typeof errors = {};
    const parsed = contactSchema.safeParse(next);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const [head] = issue.path;
        if (head === "phone") found.phone = s.contact.errors.phone;
        else if (head === "mapsUrl" || head === "instagram" || head === "tiktok") found[head] = s.contact.errors.url;
      }
    }
    if (!next.address.ro) found.addressRo = s.contact.errors.address;
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setError(s.invalid);
      return;
    }
    startTransition(async () => {
      const result = await saveConfig("contact", next);
      if (result.ok) {
        setBase(next);
        setSaved(true);
        setError(null);
      } else {
        setError(result.error === "invalid" ? s.invalid : t.common.error);
      }
    });
  };

  const url = { type: "url", inputMode: "url", autoCapitalize: "none", spellCheck: false, maxLength: 600 } as const;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <p className="mb-6 max-w-[64ch] text-[0.9375rem] text-muted">{s.contact.lead}</p>

      <div className="grid max-w-3xl gap-5 border-t border-line-strong pt-6">
        <Field label={s.contact.phone} htmlFor="contact-phone" hint={s.contact.phoneHint} error={errors.phone}>
          <Input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            maxLength={40}
            value={values.phone}
            onChange={(e) => set({ phone: e.target.value })}
            aria-invalid={errors.phone ? true : undefined}
            className="max-w-sm"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={s.contact.addressRo} htmlFor="contact-address-ro" error={errors.addressRo}>
            <Input
              id="contact-address-ro"
              lang="ro"
              maxLength={200}
              value={values.address.ro}
              onChange={(e) => set({ address: { ...values.address, ro: e.target.value } })}
              aria-invalid={errors.addressRo ? true : undefined}
            />
          </Field>
          <Field label={s.contact.addressRu} htmlFor="contact-address-ru">
            <Input
              id="contact-address-ru"
              lang="ru"
              maxLength={200}
              value={values.address.ru}
              onChange={(e) => set({ address: { ...values.address, ru: e.target.value } })}
            />
          </Field>
        </div>

        <Field label={s.contact.maps} htmlFor="contact-maps" hint={s.contact.mapsHint} error={errors.mapsUrl}>
          <Input
            id="contact-maps"
            {...url}
            value={values.mapsUrl}
            onChange={(e) => set({ mapsUrl: e.target.value })}
            aria-invalid={errors.mapsUrl ? true : undefined}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label={s.contact.instagram}
            htmlFor="contact-instagram"
            hint={s.contact.socialHint}
            error={errors.instagram}
            optional={t.common.optional}
          >
            <Input
              id="contact-instagram"
              {...url}
              value={values.instagram}
              onChange={(e) => set({ instagram: e.target.value })}
              aria-invalid={errors.instagram ? true : undefined}
            />
          </Field>
          <Field
            label={s.contact.tiktok}
            htmlFor="contact-tiktok"
            hint={s.contact.socialHint}
            error={errors.tiktok}
            optional={t.common.optional}
          >
            <Input
              id="contact-tiktok"
              {...url}
              value={values.tiktok}
              onChange={(e) => set({ tiktok: e.target.value })}
              aria-invalid={errors.tiktok ? true : undefined}
            />
          </Field>
        </div>
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        saved={saved}
        error={error}
        onSave={save}
        onDiscard={() => {
          setValues(base);
          setErrors({});
          setError(null);
        }}
        labels={{ save: t.common.save, saving: t.common.saving, saved: t.common.saved, unsaved: s.unsaved, discard: s.discard }}
      />
    </form>
  );
}
