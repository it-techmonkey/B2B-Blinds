import Link from "next/link";
import { SidebarNavLink } from "@/components/SidebarNavLink";
import { LogoutButton } from "@/components/LogoutButton";
import { getSession } from "@/lib/auth/get-session";
import { prisma } from "@/lib/db";
import { SITE_BRAND } from "@/lib/site";

type DashboardRole = "ADMIN" | "CUSTOMER";
type NavIcon = "orders" | "clients" | "products" | "profile" | "catalog" | "cart" | "checkout";
type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  match?: "exact" | "prefix";
  excludePrefixes?: string[];
};

const ROLE_META: Record<
  DashboardRole,
  {
    label: string;
    home: string;
    subtitle: string;
    links: NavItem[];
  }
> = {
  ADMIN: {
    label: "Admin",
    home: "/admin/orders",
    subtitle: "Operations",
    links: [
      { href: "/admin/orders", label: "Orders", icon: "orders", match: "prefix" },
      { href: "/admin/clients", label: "Clients", icon: "clients", match: "prefix" },
      { href: "/admin/products", label: "Products", icon: "products", match: "prefix" },
    ],
  },
  CUSTOMER: {
    label: "Customer",
    home: "/profile",
    subtitle: "Account",
    links: [
      { href: "/profile", label: "Profile", icon: "profile" },
      { href: "/orders", label: "Orders", icon: "orders", match: "prefix", excludePrefixes: ["/orders/checkout"] },
      { href: "/", label: "Catalog", icon: "catalog" },
      { href: "/cart", label: "Cart", icon: "cart" },
      { href: "/orders/checkout", label: "Checkout", icon: "checkout" },
    ],
  },
};

function NavIconGlyph({ icon }: { icon: NavIcon }) {
  if (icon === "orders") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (icon === "clients") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="11" r="3.2" />
        <path d="M19.5 18a3.2 3.2 0 0 0-2.4-3.1M4.5 18a3.2 3.2 0 0 1 2.4-3.1" />
      </svg>
    );
  }
  if (icon === "products") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4.5 8 12 4l7.5 4L12 12z" />
        <path d="M4.5 8v8L12 20l7.5-4V8M12 12v8" />
      </svg>
    );
  }
  if (icon === "profile") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8.5" r="3.2" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </svg>
    );
  }
  if (icon === "catalog") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 5.5h12v13H6z" />
        <path d="M9 8.5h6M9 12h6M9 15.5h4" />
      </svg>
    );
  }
  if (icon === "cart") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="10" cy="19" r="1.5" />
        <circle cx="17" cy="19" r="1.5" />
        <path d="M3.5 5h2l1.8 9.2a1.5 1.5 0 0 0 1.5 1.2h8.9a1.5 1.5 0 0 0 1.5-1.2L21 8H7.2" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v16M7.5 8.5h7a2.5 2.5 0 0 1 0 5h-5a2.5 2.5 0 0 0 0 5h7" />
    </svg>
  );
}

function NavBlock({ role, inverted = false }: { role: DashboardRole; inverted?: boolean }) {
  return ROLE_META[role].links.map((item) => (
    <SidebarNavLink
      key={item.href}
      href={item.href}
      match={item.match}
      inverted={inverted}
      icon={<NavIconGlyph icon={item.icon} />}
      excludePrefixes={item.excludePrefixes}
    >
      {item.label}
    </SidebarNavLink>
  ));
}

export async function DashboardShell({ role, children }: { role: DashboardRole; children: React.ReactNode }) {
  const meta = ROLE_META[role];
  const session = await getSession();
  let accountLabel: string | undefined;
  if (session?.sub) {
    const row = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { name: true, email: true },
    });
    accountLabel = row?.name?.trim() || row?.email || session.email;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-60 flex-col border-r border-[#1f2430] bg-[#171b23] text-white md:flex">
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <Link href={meta.home} className="brand-mark text-[1.02rem] text-white">
            {SITE_BRAND}
          </Link>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">{meta.subtitle}</p>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col px-3 py-6">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/42">Navigation</p>
          <div className="mt-2 space-y-1.5 overflow-y-auto pr-1">
            <NavBlock role={role} inverted />
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="rounded-[12px] border border-white/12 bg-white/6 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/92" title={accountLabel}>
                {accountLabel ?? meta.label}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">{meta.label}</p>
            </div>
            <LogoutButton className="!mt-2 !h-9 w-full justify-center rounded-[10px] border border-white/22 bg-white/10 px-2.5 text-[11px] text-white hover:bg-white/14" />
          </div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-border bg-white px-4 py-3 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{accountLabel ?? meta.label}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{SITE_BRAND}</p>
          </div>
          <LogoutButton className="!h-9 !w-auto shrink-0 justify-center rounded-[10px] border border-border bg-white px-3 text-xs text-foreground" />
        </div>
        <div className="-mx-1 mt-3 flex snap-x gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {meta.links.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              match={item.match}
              compact
              icon={<NavIconGlyph icon={item.icon} />}
              excludePrefixes={item.excludePrefixes}
            >
              {item.label}
            </SidebarNavLink>
          ))}
        </div>
      </div>

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
