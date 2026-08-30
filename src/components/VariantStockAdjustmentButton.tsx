"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

type AdjustmentType = "INCREASE" | "DECREASE";
type AdjustmentReason = "MISSING" | "FOUND" | "MISPLACED" | "COUNTING_ERROR" | "OTHER";

const reasonLabels: Record<AdjustmentReason, string> = {
  MISSING: "Missing",
  FOUND: "Found / appeared",
  MISPLACED: "Misplaced",
  COUNTING_ERROR: "Counting error",
  OTHER: "Other",
};

export function VariantStockAdjustmentButton({ productId, variantId, onDone }: { productId: string; variantId: string; onDone?: () => Promise<void> | void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<AdjustmentType>("DECREASE");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("COUNTING_ERROR");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a whole quantity greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/products/${productId}/variants/${variantId}`, {
        method: "POST",
        body: JSON.stringify({ type, quantity: parsedQuantity, reason, note: note.trim() || undefined }),
      });
      setOpen(false);
      setQuantity("");
      setNote("");
      if (onDone) await onDone();
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stock adjustment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="font-medium text-primary hover:underline" onClick={() => setOpen(true)}>Adjust stock</button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
          <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Adjust stock</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use this for a warehouse-count correction, not a purchase batch.</p>
              </div>
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">✕</button>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="field-label" htmlFor={`adjustment-type-${variantId}`}>Adjustment type</label>
                <select id={`adjustment-type-${variantId}`} className="select-field" value={type} onChange={(event) => setType(event.target.value as AdjustmentType)} disabled={busy}>
                  <option value="DECREASE">Lost stock (reduce stock)</option>
                  <option value="INCREASE">Increased stock (add stock)</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor={`adjustment-quantity-${variantId}`}>Quantity</label>
                <input id={`adjustment-quantity-${variantId}`} type="number" min="1" step="1" className="input-field" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={busy} />
              </div>
              <div>
                <label className="field-label" htmlFor={`adjustment-reason-${variantId}`}>Reason</label>
                <select id={`adjustment-reason-${variantId}`} className="select-field" value={reason} onChange={(event) => setReason(event.target.value as AdjustmentReason)} disabled={busy}>
                  {Object.entries(reasonLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor={`adjustment-note-${variantId}`}>Extra note <span className="font-normal text-muted-foreground">(optional)</span></label>
                <textarea id={`adjustment-note-${variantId}`} rows={3} className="input-field resize-y" placeholder="Add a brief explanation" value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} />
              </div>
            </div>
            {error ? <p className="alert-error text-sm">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="btn-secondary h-9 px-4 text-sm">Cancel</button>
              <button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">{busy ? "Saving…" : "Adjust stock"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
