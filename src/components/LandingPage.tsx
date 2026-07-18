import Link from "next/link";
import { SITE_BRAND } from "@/lib/site";
import { CATEGORY_ORDER } from "@/lib/category-order";

const CATEGORY_BLURBS: Record<string, string> = {
  "Box Blinds": "Blind fabric lines, with sizes listed by width in millimetres.",
  "Ladder Tapes": "Ladder tapes to match your blind fabrics.",
  "Brackets & Swatches": "Fixings, brackets, and swatch sets.",
  "Tools & Machines": "Tools and machines for assembly and finishing.",
};

const BENEFITS = [
  {
    title: "Pricing set for your account",
    body: "Your account discount and any agreed per-product prices are applied automatically when you sign in.",
  },
  {
    title: "Sizes listed by width in millimetres",
    body: "Each fabric line lists its available sizes by width in millimetres, so you can order the size you need.",
  },
  {
    title: "Invoices and order tracking",
    body: "Download a PDF invoice for any order, and follow its status from created to shipped to delivered.",
  },
  {
    title: "Your full order history",
    body: "Every order you place is saved to your account, so reordering is straightforward.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Register your business",
    body: "Enter your business name and contact details. It only takes a few minutes.",
  },
  {
    n: "02",
    title: "We approve your account",
    body: `${SITE_BRAND} reviews each application and sets your account pricing before your first sign-in.`,
  },
  {
    n: "03",
    title: "Sign in and order",
    body: "Once approved, sign in to browse the catalogue at your prices and place your orders.",
  },
];

function SectionKicker({ children }: { children: React.ReactNode }) {
  return <p className="section-kicker">{children}</p>;
}

type Role = "ADMIN" | "CUSTOMER" | null;

/** Where a signed-in user's "Dashboard" link should take them. */
function dashboardHref(role: Role): string {
  return role === "ADMIN" ? "/admin/orders" : "/catalog";
}

export function LandingPage({ role = null }: { role?: Role }) {
  const isSignedIn = role !== null;
  const dashHref = dashboardHref(role);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/86 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,24,38,0.3)] backdrop-blur-xl sm:px-5">
          <div>
            <span className="brand-mark text-base text-foreground">{SITE_BRAND}</span>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Trade portal
            </p>
          </div>
          <nav className="flex items-center gap-2">
            {isSignedIn ? (
              <Link href={dashHref} className="btn-primary h-10 px-4 text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost h-10 px-3 text-sm">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary h-10 px-4 text-sm">
                  Open a trade account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 pb-14 pt-12 md:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-20">
          <div>
            <span className="badge badge-delivered">Wholesale · Trade only</span>
            <h1 className="page-title mt-5 !text-[clamp(2.3rem,1.4rem+3vw,3.6rem)]">
              Wholesale Faux wood blinds.
            </h1>
            <p className="dash-desc mt-5 !max-w-xl !text-base">
              {SITE_BRAND} supplies box blinds, ladder tapes, brackets, and tools to the trade. Register your
              business, and once your account is approved you can order online at your agreed prices.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <Link href={dashHref} className="btn-primary h-12 px-6 text-[15px]">
                  Go to your dashboard
                </Link>
              ) : (
                <>
                  <Link href="/register" className="btn-primary h-12 px-6 text-[15px]">
                    Open a trade account
                  </Link>
                  <Link href="/login" className="btn-secondary h-12 px-6 text-[15px]">
                    Sign in
                  </Link>
                </>
              )}
            </div>
            {!isSignedIn ? (
              <p className="mt-4 text-xs text-muted-foreground">
                Trade applications are reviewed and priced by our team before your first order.
              </p>
            ) : null}
          </div>

          {/* Portal preview visual */}
          <div className="relative">
            <div className="card-dashboard overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <span className="brand-mark text-sm text-foreground">Your catalogue</span>
                <span className="badge badge-created">Trade price applied</span>
              </div>
              <div className="divide-y divide-border/70">
                {CATEGORY_ORDER.map((cat) => (
                  <div key={cat} className="flex items-center justify-between px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{cat}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Priced to your account</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                      View
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-border bg-muted px-5 py-3.5">
                <span className="text-xs font-medium text-muted-foreground">Categories</span>
                <span className="text-sm font-semibold text-foreground">Your prices applied</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-3 -top-3 hidden rounded-[14px] border border-border bg-white px-3.5 py-2.5 shadow-[var(--shadow-md)] sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Invoice</p>
              <p className="mt-0.5 text-xs font-semibold text-foreground">PDF ready</p>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="grid gap-3 border-y border-border/70 py-7 sm:grid-cols-3">
          {[
            { k: "Trade only", v: "Approved accounts with agreed pricing" },
            { k: "Order online", v: "Place orders whenever it suits you" },
            { k: "Sizes in millimetres", v: "Fabric widths listed in mm" },
          ].map((item) => (
            <div key={item.k} className="text-center sm:text-left">
              <p className="text-sm font-semibold text-foreground">{item.k}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.v}</p>
            </div>
          ))}
        </section>

        {/* How it works — only relevant to prospective (logged-out) visitors */}
        {!isSignedIn ? (
          <section className="py-14 md:py-18">
            <SectionKicker>Getting started</SectionKicker>
            <h2 className="page-title mt-3 !text-[clamp(1.8rem,1.3rem+1.6vw,2.5rem)]">
              Three steps to your first order.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="card-dashboard flex h-full flex-col p-6">
                  <span
                    className="text-2xl font-semibold tracking-[-0.03em] text-primary"
                    style={{ fontFamily: "var(--font-playfair)" }}
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Categories */}
        <section className="py-14 md:py-18">
          <SectionKicker>What we supply</SectionKicker>
          <h2 className="page-title mt-3 !text-[clamp(1.8rem,1.3rem+1.6vw,2.5rem)]">
            Blinds and supplies in one catalogue.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="card-dashboard flex h-full flex-col p-5">
                <h3 className="text-base font-semibold text-foreground">{cat}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {CATEGORY_BLURBS[cat]}
                </p>
                <span className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Trade catalogue
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="rounded-[24px] border border-border bg-white p-6 shadow-[var(--shadow-sm)] sm:p-10">
          <SectionKicker>Why order with us</SectionKicker>
          <h2 className="page-title mt-3 !text-[clamp(1.8rem,1.3rem+1.6vw,2.5rem)]">
            A straightforward trade ordering account.
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="m5 12.5 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="overflow-hidden rounded-[24px] border border-sidebar bg-sidebar px-6 py-12 text-sidebar-foreground shadow-[var(--shadow-md)] sm:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="text-[clamp(1.8rem,1.3rem+1.8vw,2.6rem)] font-semibold leading-tight tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-playfair)" }}
            >
              {isSignedIn ? "Pick up where you left off." : "Open your trade account today."}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70 sm:text-base">
              {isSignedIn
                ? "Your catalogue, pricing, and order history are ready in your dashboard."
                : "Register your business in a couple of minutes. Once we've approved and priced your account, your catalogue and ordering are ready to go."}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {isSignedIn ? (
                <Link
                  href={dashHref}
                  className="inline-flex h-12 items-center justify-center rounded-[14px] bg-white px-6 text-[15px] font-semibold text-sidebar transition-transform duration-200 hover:-translate-y-px"
                >
                  Go to your dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center rounded-[14px] bg-white px-6 text-[15px] font-semibold text-sidebar transition-transform duration-200 hover:-translate-y-px"
                  >
                    Open a trade account
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-[14px] border border-white/25 px-6 text-[15px] font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-white/10"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/70 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-center sm:text-left">
            <span className="brand-mark text-sm text-foreground">{SITE_BRAND}</span>
            <p className="mt-0.5 text-xs text-muted-foreground">Wholesale blinds, tapes, brackets, and tools.</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/register" className="link-muted !text-xs">
              Register
            </Link>
            <Link href="/login" className="link-muted !text-xs">
              Sign in
            </Link>
            <span>© {new Date().getFullYear()} {SITE_BRAND}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
