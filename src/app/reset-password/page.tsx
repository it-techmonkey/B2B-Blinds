"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiJson } from "@/lib/api-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await apiJson("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      router.push("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        Invalid reset link.{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Request a new one
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className="alert-error">{error}</p> : null}
      <div className="space-y-1.5">
        <label htmlFor="password" className="field-label">New password</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="new-password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="field-label">Confirm new password</label>
        <input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="input-field"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-shell">
      <section className="auth-panel w-full max-w-md">
        <div className="w-full">
          <div className="mb-6 space-y-3">
            <Link href="/" className="brand-mark text-base text-foreground">
              Hyde Park Wood Ltd
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Set new password</h1>
            <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
          </div>
          <Suspense fallback={<div className="space-y-3"><div className="skeleton-bar" /><div className="skeleton-bar" /></div>}>
            <ResetPasswordForm />
          </Suspense>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to login
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
