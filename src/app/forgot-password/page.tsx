"use client";

import Link from "next/link";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiJson("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel w-full max-w-md">
        <div className="w-full">
          <div className="mb-6 space-y-3">
            <Link href="/" className="brand-mark text-base text-foreground">
              Hyde Park Wood Ltd
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Forgot password</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-[14px] border border-border/80 bg-muted/40 px-4 py-5 text-sm text-foreground">
              <p className="font-medium">Check your inbox</p>
              <p className="mt-1 text-muted-foreground">
                If <span className="font-medium text-foreground">{email}</span> is registered, a reset link has been sent. It expires in 1 hour.
              </p>
              <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error ? <p className="alert-error">{error}</p> : null}
              <div className="space-y-1.5">
                <label htmlFor="email" className="field-label">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-sm text-muted-foreground">
                Remember it?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
