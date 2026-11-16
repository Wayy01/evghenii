import { ButtonLink } from "@/components/ui/button";

// Rendered without route params, so it speaks both site languages.
export default function NotFound() {
  return (
    <main className="page flex min-h-dvh flex-col justify-center py-24">
      <p className="label text-muted">404</p>
      <h1 className="display mt-5 text-[clamp(3.5rem,13vw,9rem)]">
        Pagina nu există
        <span className="block text-faint">Такой страницы нет</span>
      </h1>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/ro" size="lg">
          Înapoi acasă
        </ButtonLink>
        <ButtonLink href="/ru" size="lg" variant="outline">
          На главную
        </ButtonLink>
      </div>
    </main>
  );
}
