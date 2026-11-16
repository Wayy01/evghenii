"use client";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAdminI18n } from "@/i18n/client";
import { loginAction, type LoginState } from "@/lib/admin/auth-actions";

export function LoginForm() {
  const { locale, t } = useAdminI18n();
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: false });
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="locale" value={locale} />
      <Field label={t.login.password} htmlFor="password" error={state.error ? t.login.error : null}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={state.error || undefined}
            aria-describedby={state.error ? "password-error" : undefined}
            className="h-14 pr-14"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? t.login.hide : t.login.show}
            aria-pressed={visible}
            className="absolute inset-y-0 right-1 my-auto inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:text-fg"
          >
            {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? t.login.submitting : t.login.submit}
        <ArrowRight size={20} weight="bold" />
      </Button>
    </form>
  );
}
