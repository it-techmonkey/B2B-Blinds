import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import { getSession } from "@/lib/auth/get-session";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (session?.role === "ADMIN") {
    redirect("/admin/orders");
  }
  if (session?.role === "CUSTOMER") {
    redirect("/");
  }

  await searchParams;

  return (
    <div className="auth-shell">
      <section className="auth-panel w-full max-w-md">
        <div className="w-full">
          <div className="mb-6 space-y-3">
            <Link href="/" className="brand-mark text-base text-foreground">
              Hyde Park Wood Ltd
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Create account</h1>
            <p className="text-sm text-muted-foreground">Set up your business profile to place and track wholesale orders.</p>
          </div>
          <Suspense fallback={<div className="space-y-3"><div className="skeleton-bar" /><div className="skeleton-bar" /></div>}>
            <RegisterForm />
          </Suspense>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
