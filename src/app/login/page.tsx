import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth/get-session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (session?.role === "ADMIN") {
    redirect("/admin/orders");
  }
  if (session?.role === "CUSTOMER") {
    redirect("/");
  }

  const sp = await searchParams;
  const next = sp.next;
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <div className="auth-shell">
      <section className="auth-panel w-full max-w-md">
        <div className="w-full">
          <div className="mb-6 space-y-3">
            <Link href="/" className="brand-mark text-base text-foreground">
              B2B Blinds
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Login</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your orders, invoices, and account activity.</p>
          </div>
          <Suspense fallback={<div className="space-y-3"><div className="skeleton-bar" /><div className="skeleton-bar" /></div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-sm text-muted-foreground">
            New here?{" "}
            <Link href={registerHref} className="font-medium text-primary hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
