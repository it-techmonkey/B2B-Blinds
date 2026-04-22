import Link from "next/link";
import { SidebarNavLink } from "@/components/SidebarNavLink";
import { LogoutButton } from "@/components/LogoutButton";

type DashboardRole = "ADMIN" | "CUSTOMER";

const ROLE_META: Record<
  DashboardRole,
  { label: string; home: string; links: Array<{ href: string; label: string; match?: "exact" | "prefix" }> }
> = {
  ADMIN: {
    label: "Admin",
    home: "/admin/orders",
    links: [
      { href: "/admin/orders", label: "Orders", match: "prefix" },
      { href: "/admin/products", label: "Products", match: "prefix" },
    ],
  },
  CUSTOMER: {
    label: "Customer",
    home: "/profile",
    links: [
      { href: "/profile", label: "Profile" },
      { href: "/orders", label: "Orders", match: "prefix" },
      { href: "/", label: "Catalog" },
      { href: "/cart", label: "Cart" },
      { href: "/orders/checkout", label: "Checkout" },
    ],
  },
};

function NavBlock({ role, inverted = false }: { role: DashboardRole; inverted?: boolean }) {
  return ROLE_META[role].links.map((item) => (
    <SidebarNavLink key={item.href} href={item.href} match={item.match} inverted={inverted}>
      {item.label}
    </SidebarNavLink>
  ));
}

function MobileNav({ role }: { role: DashboardRole }) {
  const meta = ROLE_META[role];
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-white px-4 py-3 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dashboard</p>
          <p className="mt-1 text-sm font-medium text-foreground">{meta.label}</p>
        </div>
        <div className="shrink-0">
          <LogoutButton className="!h-9 !w-auto justify-center rounded-[10px] border border-border bg-white px-3 text-xs text-foreground" />
        </div>
      </div>
      <div
        className="mt-3 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${meta.links.length}, minmax(0, 1fr))` }}
      >
        <NavBlock role={role} />
      </div>
    </div>
  );
}

export function DashboardShell({ role, children }: { role: DashboardRole; children: React.ReactNode }) {
  const meta = ROLE_META[role];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-[#1f2430] bg-[#171b23] text-white md:flex">
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <Link href={meta.home} className="brand-mark text-[1.02rem] text-white">
            B2B Blinds
          </Link>
          <div className="mt-4 rounded-[12px] border border-white/12 bg-white/6 p-3 backdrop-blur">
            <p className="text-sm font-medium text-white/92">{meta.label}</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col px-3 py-6">
          <div className="mt-3 space-y-1.5">
            <NavBlock role={role} inverted />
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <LogoutButton className="!h-10 w-full justify-center rounded-[10px] border border-white/20 bg-white/8 text-white hover:bg-white/12" />
        </div>
      </aside>

      <MobileNav role={role} />

      <div className="md:pl-60">
        <main className="relative px-4 pb-7 pt-4 md:px-6 md:py-7 lg:px-8">
          <div className="mx-auto max-w-[1520px]">
            <div className="dashboard-surface">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
