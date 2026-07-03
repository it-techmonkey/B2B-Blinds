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
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
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
        body: JSON.stringify({ name, businessName, email, phone, city, password }),
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="reg-name">
            Full name
          </label>
          <input
            id="reg-name"
            required
            autoComplete="name"
            className="input-field"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="reg-business">
            Business name
          </label>
          <input
            id="reg-business"
            required
            autoComplete="organization"
            className="input-field"
            placeholder="Company or trade name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
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
            placeholder="user@blinds.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="reg-phone">
            Phone
          </label>
          <input
            id="reg-phone"
            type="tel"
            required
            autoComplete="tel"
            className="input-field"
            placeholder="Include country code if applicable"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="reg-city">
            City
          </label>
          <input
            id="reg-city"
            required
            autoComplete="address-level2"
            className="input-field"
            placeholder="Dispatch or delivery city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
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
