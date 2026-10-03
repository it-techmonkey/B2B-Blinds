"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { apiJson } from "@/lib/api-client";
import { writeCartPayload, writeResumeInfo } from "@/lib/cart-storage";

type SavedOrderView = {
  id: string;
  createdAt: string;
  updatedAt: string;
  customer: Record<string, string | undefined>;
  lines: { productId: string; variantId: string; quantity: number; productName: string; size: string; price: string }[];
  unavailable: number;
  currentTotal: string;
  savedTotal: string;
  priceChanged: boolean;
};

export function SavedOrdersClient({ initialOrders, justSaved }: { initialOrders: SavedOrderView[]; justSaved: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function resume(o: SavedOrderView) {
    if (o.lines.length === 0) return;
    const notices: string[] = [];
    if (o.priceChanged) {
      notices.push(`Prices have changed since you saved this order. Total was $${o.savedTotal}, now $${o.currentTotal}.`);
    }
    if (o.unavailable > 0) {
      notices.push(`${o.unavailable} item${o.unavailable === 1 ? " is" : "s are"} no longer available and were removed.`);
    }
    writeCartPayload({
      items: o.lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        quantity: l.quantity,
        productName: l.productName,
        size: l.size,
        price: l.price,
      })),
    });
    writeResumeInfo({ savedOrderId: o.id, customer: o.customer, notice: notices.join(" ") || undefined });
    router.push("/orders/checkout");
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError(null);
    try {
      await apiJson(`/api/saved-orders/${deleteId}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((o) => o.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {justSaved ? (
        <p className="rounded-[14px] border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Order saved. You can come back and place it whenever you are ready.
        </p>
      ) : null}
      {error ? <p className="alert-error">{error}</p> : null}

      {orders.length === 0 ? (
        <div className="card-dashboard flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-xl font-semibold tracking-[-0.04em] text-foreground">No saved orders</p>
          <p className="mt-1 text-sm text-muted-foreground">Use “Save for later” at checkout to keep an order for another day.</p>
          <Link href="/catalog" className="btn-primary mt-5">
            Open catalog
          </Link>
        </div>
      ) : (
        orders.map((o) => {
          const units = o.lines.reduce((n, l) => n + l.quantity, 0);
          return (
            <article key={o.id} className="card-dashboard space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="section-kicker">Saved {new Date(o.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.lines.length} product{o.lines.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="section-kicker">Current total</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.05em]">${o.currentTotal}</p>
                  {o.priceChanged ? <p className="text-xs text-amber-700">Was ${o.savedTotal} when saved</p> : null}
                </div>
              </div>
              <ul className="divide-y divide-border/60 text-sm">
                {o.lines.map((l) => (
                  <li key={l.variantId} className="flex justify-between gap-3 py-1.5">
                    <span>
                      {l.productName} <span className="text-muted-foreground">{l.size}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {l.quantity} × ${l.price}
                    </span>
                  </li>
                ))}
              </ul>
              {o.unavailable > 0 ? (
                <p className="text-xs text-amber-700">
                  {o.unavailable} item{o.unavailable === 1 ? " is" : "s are"} no longer available.
                </p>
              ) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn-secondary" onClick={() => setDeleteId(o.id)}>
                  Delete
                </button>
                <button type="button" className="btn-primary" disabled={o.lines.length === 0} onClick={() => resume(o)}>
                  Continue to checkout
                </button>
              </div>
            </article>
          );
        })
      )}

      {deleteId ? (
        <ConfirmModal
          title="Delete saved order?"
          message="This removes the saved order. It has not been placed, so no order or invoice is affected."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      ) : null}
    </div>
  );
}
