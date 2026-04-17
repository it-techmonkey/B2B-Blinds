"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNavLink({
  href,
  children,
  match = "exact",
}: {
  href: string;
  children: React.ReactNode;
  match?: "exact" | "prefix";
}) {
  const pathname = usePathname();
  const active =
    match === "prefix" ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-[14px] border px-3.5 py-3 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-border bg-muted text-foreground shadow-[var(--shadow-sm)]"
          : "border-transparent text-foreground/70 hover:border-border hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          active ? "bg-foreground" : "bg-foreground/20 group-hover:bg-foreground/45"
        }`}
        aria-hidden
      />
      {children}
    </Link>
  );
}
