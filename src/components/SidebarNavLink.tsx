"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNavLink({
  href,
  children,
  match = "exact",
  inverted = false,
  icon,
  compact = false,
  excludePrefixes = [],
}: {
  href: string;
  children: React.ReactNode;
  match?: "exact" | "prefix";
  inverted?: boolean;
  icon?: React.ReactNode;
  compact?: boolean;
  excludePrefixes?: string[];
}) {
  const pathname = usePathname();
  const excluded = excludePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const active =
    !excluded && (match === "prefix" ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href);

  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      className={`group ${compact ? "shrink-0 whitespace-nowrap" : "min-w-0"} flex items-center gap-2.5 rounded-[14px] border ${
        compact ? "px-3 py-2 text-xs" : "px-3.5 py-3 text-sm"
      } font-medium transition-all duration-200 ${
        inverted
          ? active
            ? "border-white/20 bg-white/12 text-white"
            : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/8 hover:text-white"
          : active
            ? "border-border bg-muted text-foreground shadow-[var(--shadow-sm)]"
            : "border-transparent text-foreground/70 hover:border-border hover:bg-muted/70 hover:text-foreground"
      }`}
    >
      {icon ? (
        <span
          className={`inline-flex ${
            compact ? "h-5 w-5 rounded-[7px]" : "h-6 w-6 rounded-[8px]"
          } shrink-0 items-center justify-center transition-colors ${
            inverted
              ? active
                ? "bg-white/16 text-white"
                : "bg-white/8 text-white/72 group-hover:bg-white/14 group-hover:text-white"
              : active
                ? "bg-white text-foreground"
                : "bg-muted/75 text-muted-foreground group-hover:text-foreground"
          }`}
          aria-hidden
        >
          {icon}
        </span>
      ) : (
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
      )}
      <span className={compact ? "whitespace-nowrap" : "truncate"}>{children}</span>
    </Link>
  );
}
