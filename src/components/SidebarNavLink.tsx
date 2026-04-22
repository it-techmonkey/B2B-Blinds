"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNavLink({
  href,
  children,
  match = "exact",
  inverted = false,
}: {
  href: string;
  children: React.ReactNode;
  match?: "exact" | "prefix";
  inverted?: boolean;
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
        inverted
          ? active
            ? "border-white/20 bg-white/12 text-white"
            : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/8 hover:text-white"
          : active
            ? "border-border bg-muted text-foreground shadow-[var(--shadow-sm)]"
            : "border-transparent text-foreground/70 hover:border-border hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          inverted
            ? active
              ? "bg-white"
              : "bg-white/35 group-hover:bg-white/70"
            : active
              ? "bg-foreground"
              : "bg-foreground/20 group-hover:bg-foreground/45"
        }`}
        aria-hidden
      />
      {children}
    </Link>
  );
}
