"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";
import { safeNextPath } from "@/lib/safe-next-path";
import { PasswordField } from "@/components/PasswordField";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next")) ?? "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendingMessage(null);
    setLoading(true);
    try {
      const res = await apiJson<{ pendingApproval?: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (res.pendingApproval) {
        setPendingMessage(
          "Registration received. Hyde Park Wood Ltd will review and approve your account before you can sign in."
        );
        return;
      }
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
      {pendingMessage ? <p className="alert-success">{pendingMessage}</p> : null}
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
      <PasswordField
        id="reg-password"
        label={
          <>
            Password <span className="font-normal text-muted-foreground">(min 8)</span>
          </>
        }
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        minLength={8}
        disabled={Boolean(pendingMessage)}
      />
      <button type="submit" disabled={loading || Boolean(pendingMessage)} className="btn-primary mt-2 w-full">
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
