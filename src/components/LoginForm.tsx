"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";
import { safeNextPath } from "@/lib/safe-next-path";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next")) ?? "";
  const resetSuccess = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiJson<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const fallback = res.user.role === "ADMIN" ? "/admin/orders" : "/";
      const dest = nextPath || fallback;
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="login-form" onSubmit={onSubmit} className="space-y-4">
      {resetSuccess ? (
        <p className="rounded-[10px] border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
          Password updated — you can now sign in.
        </p>
      ) : null}
      {error ? <p className="alert-error">{error}</p> : null}
      <div>
        <label className="field-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          className="input-field"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="field-label" htmlFor="login-password">Password</label>
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordField
          id="login-password"
          label=""
          autoComplete="current-password"
          placeholder="Enter password"
          value={password}
          onChange={setPassword}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
