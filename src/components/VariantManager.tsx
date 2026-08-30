"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";
import { VariantStockAdjustmentButton } from "@/components/VariantStockAdjustmentButton";

type UnitType = "PIECE" | "METER" | "BOX" | "ROLL";
type Variant = { id: string; size: string; price: string; stock: number; unit: UnitType; unitDetail: string | null; currentCost: string };
type RowDraft = { size: string; price: string; unit: UnitType; unitDetail: string };

function sortVariants(variants: Variant[]) {
  return [...variants].sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));
}

function draftFor(variant: Variant): RowDraft {
  return { size: variant.size, price: String(variant.price), unit: variant.unit, unitDetail: variant.unitDetail ?? "" };
}

function isDirty(variant: Variant, draft: RowDraft) {
  return draft.size !== variant.size || draft.price !== String(variant.price) || draft.unit !== variant.unit || draft.unitDetail !== (variant.unitDetail ?? "");
}

export function VariantManager({ productId, initial }: { productId: string; initial: Variant[] }) {
  const router = useRouter();
  const [variants, setVariants] = useState(() => sortVariants(initial));
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() => Object.fromEntries(initial.map((variant) => [variant.id, draftFor(variant)])));
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [newRow, setNewRow] = useState({ size: "", price: "", stock: "0", unit: "PIECE" as UnitType, unitDetail: "" });

  async function refresh() {
    const result = await apiJson<{ product: { variants: Variant[] } }>("/api/products/" + productId);
    const fresh = sortVariants(result.product.variants.map((variant) => ({ ...variant, price: String(variant.price) })));
    setVariants(fresh);
    setDrafts(Object.fromEntries(fresh.map((variant) => [variant.id, draftFor(variant)])));
    router.refresh();
  }

  const updateDraft = useCallback((id: string, patch: Partial<RowDraft>) => {
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } }));
    setSaved((previous) => ({ ...previous, [id]: false }));
  }, []);

  async function saveOne(variant: Variant) {
    const draft = drafts[variant.id];
    setError(null);
    setSaving((previous) => ({ ...previous, [variant.id]: true }));
    try {
      await apiJson("/api/products/" + productId + "/variants/" + variant.id, {
        method: "PUT",
        body: JSON.stringify({ size: draft.size, price: Number(draft.price), unit: draft.unit, unitDetail: draft.unitDetail.trim() || null }),
      });
      setSaved((previous) => ({ ...previous, [variant.id]: true }));
      window.setTimeout(() => setSaved((previous) => ({ ...previous, [variant.id]: false })), 2000);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Variant update failed");
    } finally {
      setSaving((previous) => ({ ...previous, [variant.id]: false }));
    }
  }

  async function saveAll() {
    const dirty = variants.filter((variant) => isDirty(variant, drafts[variant.id]));
    if (!dirty.length) return;
    setSavingAll(true);
    try { await Promise.all(dirty.map(saveOne)); } finally { setSavingAll(false); }
  }

  async function removeRow(id: string) {
    if (!window.confirm("Delete this variant?")) return;
    setError(null);
    try {
      const response = await fetch("/api/products/" + productId + "/variants/" + id, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not delete variant");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete variant");
    }
  }

  async function addStockArrival(variantId: string, quantity: number, costPerUnit: number, note: string): Promise<boolean> {
    setError(null);
    try {
      await apiJson("/api/products/" + productId + "/variants/" + variantId, { method: "PATCH", body: JSON.stringify({ quantity, costPerUnit, note: note.trim() || undefined }) });
      await refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stock update failed");
      return false;
    }
  }

  async function addVariant(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await apiJson("/api/products/" + productId + "/variants", {
        method: "POST",
        body: JSON.stringify({ size: newRow.size.trim(), price: Number(newRow.price), stock: Number(newRow.stock), unit: newRow.unit, unitDetail: newRow.unitDetail.trim() || undefined }),
      });
      setNewRow({ size: "", price: "", stock: "0", unit: "PIECE", unitDetail: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add variant");
    } finally {
      setAdding(false);
    }
  }

  const dirtyCount = variants.filter((variant) => isDirty(variant, drafts[variant.id])).length;

  return (
    <div className="space-y-5 sm:max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Variant maintenance</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Sellable rows and live inventory</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use restock and adjustment actions to preserve an accurate stock history.</p>
        </div>
        {dirtyCount > 0 ? <button type="button" onClick={saveAll} disabled={savingAll} className="btn-primary mt-1 h-9 shrink-0 px-4 text-sm">{savingAll ? "Saving…" : "Save changes (" + dirtyCount + ")"}</button> : null}
      </div>
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="card-dashboard overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="table-head"><th className="px-4 py-3 text-left font-medium">Size</th><th className="px-4 py-3 text-left font-medium">Selling price</th><th className="px-4 py-3 text-right font-medium">Live stock</th><th className="px-4 py-3 text-left font-medium">Unit</th><th className="px-4 py-3 text-right font-medium">Actions</th></tr></thead>
            <tbody>{variants.map((variant) => <VariantRowEditor key={variant.id} productId={productId} variant={variant} draft={drafts[variant.id] ?? draftFor(variant)} isSaved={Boolean(saved[variant.id])} isSaving={Boolean(saving[variant.id])} isDirty={isDirty(variant, drafts[variant.id] ?? draftFor(variant))} onChange={(patch) => updateDraft(variant.id, patch)} onSave={() => saveOne(variant)} onDelete={() => removeRow(variant.id)} onAddStock={addStockArrival} onAdjustmentDone={refresh} />)}</tbody>
          </table>
        </div>
      </section>

      <form onSubmit={addVariant} className="card-dashboard p-5 sm:p-6">
        <p className="section-kicker">Add variant</p>
        <h3 className="mt-2 text-base font-semibold text-foreground">Create another sellable size</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Size"><input required className="input-field" value={newRow.size} onChange={(event) => setNewRow((row) => ({ ...row, size: event.target.value }))} placeholder="e.g. 120 cm" /></Field>
          <Field label="Selling price"><input required type="number" min="0" step="0.01" className="input-field" value={newRow.price} onChange={(event) => setNewRow((row) => ({ ...row, price: event.target.value }))} placeholder="0.00" /></Field>
          <Field label="Opening stock in unit"><input required type="number" min="0" step="1" className="input-field" value={newRow.stock} onChange={(event) => setNewRow((row) => ({ ...row, stock: event.target.value }))} /></Field>
          <Field label="Unit"><select className="select-field" value={newRow.unit} onChange={(event) => setNewRow((row) => ({ ...row, unit: event.target.value as UnitType }))}><option value="PIECE">Piece</option><option value="METER">Meter</option><option value="BOX">Box</option><option value="ROLL">Roll</option></select></Field>
          <Field label="Detail of unit" optional><input className="input-field" value={newRow.unitDetail} onChange={(event) => setNewRow((row) => ({ ...row, unitDetail: event.target.value }))} placeholder="e.g. 10 pieces per box" /></Field>
        </div>
        <div className="mt-5 flex justify-end"><button type="submit" disabled={adding} className="btn-primary h-9 px-4 text-sm">{adding ? "Adding…" : "Add variant"}</button></div>
      </form>
    </div>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="field-label">{label}{optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}</span>{children}</label>;
}

function VariantRowEditor({ productId, variant, draft, isSaved, isSaving, isDirty: rowIsDirty, onChange, onSave, onDelete, onAddStock, onAdjustmentDone }: {
  productId: string; variant: Variant; draft: RowDraft; isSaved: boolean; isSaving: boolean; isDirty: boolean;
  onChange: (patch: Partial<RowDraft>) => void; onSave: () => void; onDelete: () => void;
  onAddStock: (variantId: string, quantity: number, costPerUnit: number, note: string) => Promise<boolean>;
  onAdjustmentDone: () => Promise<void>;
}) {
  const [showRestock, setShowRestock] = useState(false);
  return (
    <>
      <tr className="table-row">
        <td className="px-4 py-3"><input aria-label={"Size for " + variant.size} className="input-field-sm w-full" value={draft.size} onChange={(event) => onChange({ size: event.target.value })} /></td>
        <td className="px-4 py-3"><input aria-label={"Selling price for " + variant.size} type="number" min="0" step="0.01" className="input-field-sm w-full" value={draft.price} onChange={(event) => onChange({ price: event.target.value })} /></td>
        <td className="px-4 py-3 text-right"><span className="font-medium tabular-nums text-foreground">{variant.stock}</span></td>
        <td className="px-4 py-3"><select aria-label={"Unit for " + variant.size} className="input-field-sm w-full" value={draft.unit} onChange={(event) => onChange({ unit: event.target.value as UnitType })}><option value="PIECE">Piece</option><option value="METER">Meter</option><option value="BOX">Box</option><option value="ROLL">Roll</option></select><input aria-label={"Unit detail for " + variant.size} className="input-field-sm mt-2 w-full" placeholder="Unit detail" value={draft.unitDetail} onChange={(event) => onChange({ unitDetail: event.target.value })} /></td>
        <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
          {isSaved ? <span className="font-medium text-emerald-700">Saved ✓</span> : <button type="button" disabled={isSaving || !rowIsDirty} className="font-medium text-primary hover:underline disabled:cursor-default disabled:opacity-40" onClick={onSave}>{isSaving ? "Saving…" : "Save"}</button>}
          <span className="mx-1.5 text-muted-foreground">·</span><button type="button" className="font-medium text-primary hover:underline" onClick={() => setShowRestock(true)}>Restock</button><span className="mx-1.5 text-muted-foreground">·</span><VariantStockAdjustmentButton productId={productId} variantId={variant.id} onDone={onAdjustmentDone} /><span className="mx-1.5 text-muted-foreground">·</span><button type="button" className="font-medium text-destructive hover:underline" onClick={onDelete}>Delete</button>
        </td>
      </tr>
      {showRestock ? <VariantRestockModal variant={variant} onClose={() => setShowRestock(false)} onSubmit={onAddStock} /> : null}
    </>
  );
}

function VariantRestockModal({ variant, onClose, onSubmit }: { variant: Variant; onClose: () => void; onSubmit: (variantId: string, quantity: number, costPerUnit: number, note: string) => Promise<boolean> }) {
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState(String(variant.currentCost));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    const parsedQuantity = Number(quantity); const parsedCost = Number(costPerUnit);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) return setError("Enter a whole quantity greater than zero.");
    if (!Number.isFinite(parsedCost) || parsedCost < 0) return setError("Enter a valid cost per unit.");
    setBusy(true); setError(null);
    const saved = await onSubmit(variant.id, parsedQuantity, parsedCost, note);
    setBusy(false);
    if (saved) onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div className="card-dashboard my-8 w-full max-w-md space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(13,20,32,0.32)]">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Restock {variant.size}</h2><p className="mt-1 text-sm text-muted-foreground">Record the received quantity and cost for this batch.</p></div><button type="button" disabled={busy} onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Close">✕</button></div>
        <div className="grid gap-4">
          <Field label="Quantity received"><input type="number" min="1" step="1" className="input-field" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={busy} /></Field>
          <Field label="Cost per unit (this batch)"><input type="number" min="0" step="0.01" className="input-field" value={costPerUnit} onChange={(event) => setCostPerUnit(event.target.value)} disabled={busy} /></Field>
          <Field label="Purchase cost note" optional><textarea rows={3} className="input-field resize-y" placeholder="Exchange rate, shipping rate, supplier reference…" value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} /></Field>
        </div>
        {error ? <p className="alert-error text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="btn-secondary h-9 px-4 text-sm">Cancel</button><button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">{busy ? "Saving…" : "Add batch"}</button></div>
      </div>
    </div>
  );
}
