"use client";

import { useState } from "react";
import { apiJson } from "@/lib/api-client";

type Profile = {
  businessName: string | null;
  phone: string | null;
  invoiceAddress: string | null;
  deliveryAddress: string | null;
};

export function ProfileDetailsForm({ initial }: { initial: Profile }) {
  const [businessName, setBusinessName] = useState(initial.businessName ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [invoiceAddress, setInvoiceAddress] = useState(initial.invoiceAddress ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(initial.deliveryAddress ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      await apiJson("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          businessName: businessName.trim() || null,
          phone: phone.trim() || null,
          invoiceAddress: invoiceAddress.trim() || null,
          deliveryAddress: deliveryAddress.trim() || null,
        }),
      });
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-dashboard space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Invoice & delivery</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Used as defaults at checkout and shown on admin records. Update anytime.
        </p>
      </div>

      {message ? <p className="alert-success">{message}</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="biz">
            Trading / business name
          </label>
          <input
            id="biz"
            className="input-field"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Registered or trading name"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="phone">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Best contact number"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="invoice">
            Invoice address
          </label>
          <textarea
            id="invoice"
            rows={3}
            className="input-field min-h-[5rem] resize-y py-2"
            value={invoiceAddress}
            onChange={(e) => setInvoiceAddress(e.target.value)}
            placeholder="Company name, street, city, postcode…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="delivery">
            Delivery address
          </label>
          <textarea
            id="delivery"
            rows={3}
            className="input-field min-h-[5rem] resize-y py-2"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Site or warehouse — include access notes if needed"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
