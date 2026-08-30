"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

type Client = {
  name: string;
  businessName: string | null;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  invoiceAddress: string | null;
  deliveryAddress: string | null;
};

export function AdminClientProfileForm({ clientId, initial }: { clientId: string; initial: Client }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof Client, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiJson("/api/admin/users/" + clientId, { method: "PUT", body: JSON.stringify(form) });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client details");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card-dashboard p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="section-kicker">Client profile</p><h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">Contact and delivery details</h2></div>
        <button className="btn-primary h-9 px-4 text-sm" disabled={busy}>{busy ? "Saving…" : "Save client"}</button>
      </div>
      {error ? <p className="alert-error mt-5">{error}</p> : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label="Contact name" value={form.name} onChange={(value) => update("name", value)} required />
        <TextField label="Business name" value={form.businessName ?? ""} onChange={(value) => update("businessName", value)} />
        <TextField label="Phone" value={form.phone ?? ""} onChange={(value) => update("phone", value)} />
        <TextField label="City" value={form.city ?? ""} onChange={(value) => update("city", value)} />
        <TextField label="Postcode" value={form.postcode ?? ""} onChange={(value) => update("postcode", value)} />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField label="Invoice address" value={form.invoiceAddress ?? ""} onChange={(value) => update("invoiceAddress", value)} multiline />
        <TextField label="Delivery address" value={form.deliveryAddress ?? ""} onChange={(value) => update("deliveryAddress", value)} multiline />
      </div>
      <div className="mt-5 flex justify-end sm:hidden"><button className="btn-primary h-9 px-4 text-sm" disabled={busy}>{busy ? "Saving…" : "Save client"}</button></div>
    </form>
  );
}

function TextField({ label, value, onChange, required, multiline }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; multiline?: boolean }) {
  return <label className="block"><span className="field-label">{label}</span>{multiline ? <textarea className="input-field mt-1.5 min-h-28 resize-y" value={value} onChange={(event) => onChange(event.target.value)} /> : <input required={required} className="input-field mt-1.5" value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}
