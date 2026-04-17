"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api-client";
import { clearCartPayload, readCartPayload, type CartLineMeta } from "@/lib/cart-storage";
import { InvoicePdfLink } from "@/components/InvoicePdfLink";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[16px] border border-border/70 bg-white/72 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="section-kicker">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export function CheckoutClient() {
  const router = useRouter();
  const [lines, setLines] = useState<CartLineMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [invoiceAccessToken, setInvoiceAccessToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    const p = readCartPayload();
    const items = (p?.items ?? []).filter((i) => i.quantity > 0);
    setLines(items);
  }, []);

  const total = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      t += Number(l.price) * l.quantity;
    }
    return t;
  }, [lines]);

  const lineCount = useMemo(() => lines.reduce((n, l) => n + l.quantity, 0), [lines]);

  function hasRequiredCustomerDetails() {
    return (
      customer.name.trim() &&
      customer.businessName.trim() &&
      customer.email.trim() &&
      customer.phone.trim() &&
      customer.city.trim()
    );
  }

  function continueToConfirm() {
    if (lines.length === 0) return;
    if (!hasRequiredCustomerDetails()) {
      setError("Please fill all required fields before continuing.");
      return;
    }
    setError(null);
    setConfirmStep(true);
  }

  async function placeOrder() {
    if (lines.length === 0) return;
    if (!hasRequiredCustomerDetails()) {
      setError("Please fill all required fields before placing the order.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const items = lines.map((l) => {
        const row: { productId: string; quantity: number; variantId?: string } = {
          productId: String(l.productId).trim(),
          quantity: Math.floor(Number(l.quantity)),
        };
        const vid = l.variantId && String(l.variantId).trim();
        if (vid) row.variantId = vid;
        return row;
      });
      const res = await apiJson<{ order: { id: string }; invoiceAccessToken?: string }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items,
          customer: {
            name: customer.name.trim(),
            businessName: customer.businessName.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim(),
            city: customer.city.trim(),
            notes: customer.notes.trim(),
          },
        }),
      });
      clearCartPayload();
      setPlacedOrderId(res.order.id);
      setInvoiceAccessToken(res.invoiceAccessToken ?? null);
      setLines([]);
      setConfirmStep(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrderId) {
    return (
      <div className="card-dashboard p-8 text-center sm:p-10">
        <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">Order placed</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference ID: <span className="font-mono">{placedOrderId}</span>
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <InvoicePdfLink orderId={placedOrderId} accessToken={invoiceAccessToken ?? undefined} variant="button">
            Download invoice PDF
          </InvoicePdfLink>
          <button type="button" onClick={() => router.push("/")} className="btn-primary">
            Continue shopping
          </button>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="card-dashboard p-8 text-center sm:p-10">
        <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">Cart is empty</p>
        <button type="button" onClick={() => router.push("/")} className="btn-primary mt-4">
          Browse catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Order lines</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {lines.length} product{lines.length === 1 ? "" : "s"} · {lineCount} unit{lineCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-[18px] border border-border/80 bg-muted/65 px-4 py-3 text-right">
            <p className="section-kicker">Estimated total</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">${total.toFixed(2)}</p>
          </div>
        </div>
        <div className="space-y-2 md:hidden">
          {lines.map((l) => (
            <article key={`${l.productId}-${l.variantId}`} className="card-dashboard space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold leading-5">{l.productName}</p>
                <p className="text-sm font-semibold tabular-nums">${(Number(l.price) * l.quantity).toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{l.size}</span>
                <span>
                  ${l.price} × {l.quantity}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="hidden md:block">
          <div className="table-shell overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="table-head">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">Line</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={`${l.productId}-${l.variantId}`} className="table-row">
                    <td className="px-4 py-3 font-medium">{l.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.size}</td>
                    <td className="px-4 py-3 text-right tabular-nums">${l.price}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{l.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      ${(Number(l.price) * l.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {!confirmStep ? (
        <section className="card-dashboard p-5 sm:p-6">
          <div className="mb-5 max-w-xl">
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Business details</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="co-name" className="field-label">
                Full name <span className="text-destructive">*</span>
              </label>
              <input
                id="co-name"
                className="input-field"
                value={customer.name}
                onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Contact name"
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="co-business" className="field-label">
                Business name <span className="text-destructive">*</span>
              </label>
              <input
                id="co-business"
                className="input-field"
                value={customer.businessName}
                onChange={(e) => setCustomer((prev) => ({ ...prev, businessName: e.target.value }))}
                placeholder="Company or trade name"
                autoComplete="organization"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="co-email" className="field-label">
                Email <span className="text-destructive">*</span>
              </label>
              <input
                id="co-email"
                className="input-field"
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="orders@example.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="co-phone" className="field-label">
                Phone <span className="text-destructive">*</span>
              </label>
              <input
                id="co-phone"
                className="input-field"
                value={customer.phone}
                onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Include country code if applicable"
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="co-city" className="field-label">
                City <span className="text-destructive">*</span>
              </label>
              <input
                id="co-city"
                className="input-field"
                value={customer.city}
                onChange={(e) => setCustomer((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Dispatch or delivery city"
                autoComplete="address-level2"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="co-notes" className="field-label">
                Order notes <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="co-notes"
                className="input-field min-h-[7rem] resize-y py-3"
                value={customer.notes}
                onChange={(e) => setCustomer((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="GST number, delivery window, dock instructions…"
                rows={4}
              />
            </div>
          </div>
        </section>
      ) : null}

      {confirmStep ? (
        <section className="card-dashboard border-primary/20 bg-primary/[0.04] p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-primary/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Confirm order</h2>
            </div>
            <div className="shrink-0 rounded-[18px] border border-border/80 bg-white/80 px-4 py-3 text-right shadow-[var(--shadow-sm)]">
              <p className="section-kicker">Order total</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.05em] text-foreground">${total.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <DetailRow label="Contact" value={customer.name} />
            <DetailRow label="Business" value={customer.businessName} />
            <DetailRow label="Email" value={customer.email} />
            <DetailRow label="Phone" value={customer.phone} />
            <div className="sm:col-span-2">
              <DetailRow label="City" value={customer.city} />
            </div>
          </div>

          {customer.notes.trim() ? (
            <div className="mt-4 rounded-[18px] border border-dashed border-border/90 bg-muted/35 px-4 py-3">
              <p className="section-kicker">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{customer.notes.trim()}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setConfirmStep(false)}>
              ← Edit details
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={placeOrder}
              className="btn-primary w-full min-w-[10rem] sm:w-auto"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </div>
        </section>
      ) : null}

      {!confirmStep ? (
        <div className="card-dashboard flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Estimated total</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.05em] text-foreground">${total.toFixed(2)}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" onClick={() => router.push("/")} className="btn-secondary w-full sm:w-auto">
              Edit cart
            </button>
            <button
              type="button"
              disabled={submitting || confirmStep}
              onClick={continueToConfirm}
              className="btn-primary w-full min-w-[10rem] sm:w-auto"
            >
              Continue to review
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
