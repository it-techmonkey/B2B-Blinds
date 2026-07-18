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
  const [postcode, setPostcode] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPendingMessage(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setShowConfirm(true);
  }

  async function submitApplication() {
    setLoading(true);
    try {
      const res = await apiJson<{ pendingApproval?: boolean }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, businessName, email, phone, city, postcode, deliveryAddress, password }),
      });
      setShowConfirm(false);
      if (res.pendingApproval) {
        setPendingMessage(
          "Registration received. Hyde Park Wood Ltd will review and approve your account before you can sign in."
        );
        return;
      }
      router.push(nextPath || "/");
      router.refresh();
    } catch (err) {
      setShowConfirm(false);
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
        <div>
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
        <div>
          <label className="field-label" htmlFor="reg-postcode">
            Postcode
          </label>
          <input
            id="reg-postcode"
            required
            autoComplete="postal-code"
            className="input-field"
            placeholder="Postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="reg-address">
            Full address
          </label>
          <textarea
            id="reg-address"
            required
            rows={3}
            autoComplete="street-address"
            className="input-field min-h-[5rem] resize-y py-2"
            placeholder="Company name, street, city, postcode…"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
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
      <PasswordField
        id="reg-confirm-password"
        label="Confirm password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        minLength={8}
        disabled={Boolean(pendingMessage)}
      />
      <button type="submit" disabled={loading || Boolean(pendingMessage)} className="btn-primary mt-2 w-full">
        {loading ? "Creating account…" : "Create account"}
      </button>

      {showConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setShowConfirm(false); }}
        >
          <div className="card-dashboard my-8 w-full max-w-lg space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(15,24,38,0.32)]">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Confirm your application</h2>
            <p className="text-sm text-muted-foreground">
              Please review your details before submitting. Hyde Park Wood Ltd will review your application and
              confirm your account before you can sign in.
            </p>
            <dl className="space-y-2 rounded-[12px] border border-border/70 bg-muted/20 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Full name</dt>
                <dd className="text-right font-medium text-foreground">{name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Business name</dt>
                <dd className="text-right font-medium text-foreground">{businessName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-right font-medium text-foreground">{email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="text-right font-medium text-foreground">{phone}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">City</dt>
                <dd className="text-right font-medium text-foreground">{city}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Postcode</dt>
                <dd className="text-right font-medium text-foreground">{postcode}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">Address</dt>
                <dd className="text-right font-medium text-foreground">{deliveryAddress}</dd>
              </div>
            </dl>

            {error ? <p className="alert-error text-sm">{error}</p> : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirm(false)}
                className="btn-secondary h-9 px-4 text-sm"
              >
                Go back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={submitApplication}
                className="btn-primary h-9 px-4 text-sm"
              >
                {loading ? "Submitting…" : "Confirm and apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
