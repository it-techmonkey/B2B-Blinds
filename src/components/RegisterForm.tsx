"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";
import { safeNextPath } from "@/lib/safe-next-path";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next")) ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiJson("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      router.push(nextPath || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <p className="alert-error">{error}</p> : null}
      <div>
        <label className="field-label" htmlFor="reg-name">
          Business name
        </label>
        <input
          id="reg-name"
          required
          className="input-field"
          placeholder="Company or trade name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="reg-email">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          className="input-field"
          placeholder="orders@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label className="field-label" htmlFor="reg-password">
          Password <span className="font-normal text-muted-foreground">(min 8)</span>
        </label>
        <input
          id="reg-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-field"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
