import Link from "next/link";
import { SITE_BRAND } from "@/lib/site";

export function GuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/86 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,24,38,0.3)] backdrop-blur-xl sm:flex-nowrap sm:px-5">
          <div>
            <Link href="/" className="brand-mark text-base text-foreground">
              {SITE_BRAND}
            </Link>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trade catalog</p>
          </div>
          <nav className="flex w-full items-center gap-1.5 sm:w-auto">
            <Link href="/" className="btn-ghost h-10 flex-1 px-3 text-sm sm:flex-none">
              Catalog
            </Link>
            <Link href="/login" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 pb-10 pt-6 sm:px-6 md:pt-8">
        <div className="content-stack">{children}</div>
      </main>
    </div>
  );
}
