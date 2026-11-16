import { Suspense } from "react";
import { ActiveAdminNav, AdminNav } from "@/components/admin/nav";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-[248px]">
      {/* The active-item highlight reads the URL, so it streams in after the static shell. */}
      <Suspense fallback={<AdminNav pathname={null} />}>
        <ActiveAdminNav />
      </Suspense>
      <main className="mx-auto w-full max-w-[1280px] px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 lg:px-10 lg:pt-10 lg:pb-16">
        {children}
      </main>
    </div>
  );
}
