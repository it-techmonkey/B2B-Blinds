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
    redirect("/orders");
  }

  await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="auth-panel w-full max-w-md">
        <div className="w-full">
          <div className="mb-6">
            <Link href="/" className="brand-mark text-base text-foreground">
              B2B Blinds
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Admin login</h1>
          </div>
          <Suspense fallback={<div className="space-y-3"><div className="skeleton-bar" /><div className="skeleton-bar" /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
