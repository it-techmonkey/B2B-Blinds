"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { apiJson } from "@/lib/api-client";

type UnitType = "PIECE" | "METER" | "BOX" | "ROLL";

type Variant = {
  id: string;
  size: string;
  price: string;
  stock: number;
  unit: UnitType;
};

function sizeToSortOrder(size: string): number {
  const m = size.match(/^(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 9999;
}

function sortedVariants(variants: Variant[]): Variant[] {
  return [...variants].sort((a, b) => {
    const na = sizeToSortOrder(a.size);
    const nb = sizeToSortOrder(b.size);
    if (na !== nb) return na - nb;
    return a.size.localeCompare(b.size, undefined, { numeric: true });
  });
}

type RowDraft = {
  size: string;
  price: string;
  stock: string;
  unit: UnitType;
};

function isDirty(v: Variant, d: RowDraft) {
  return d.size !== v.size || d.price !== String(v.price) || d.stock !== String(v.stock) || d.unit !== v.unit;
}

export function VariantManager({ productId, initial }: { productId: string; initial: Variant[] }) {
  const router = useRouter();
  const [variants, setVariants] = useState(() => sortedVariants(initial));
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() =>
    Object.fromEntries(
      initial.map((v) => [v.id, { size: v.size, price: String(v.price), stock: String(v.stock), unit: v.unit }])
    )
  );
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [newRow, setNewRow] = useState<RowDraft>({ size: "", price: "", stock: "0", unit: "PIECE" });

  async function refresh() {
    const res = await apiJson<{ product: { variants: Variant[] } }>(`/api/products/${productId}`);
    const fresh = sortedVariants(
      res.product.variants.map((v) => ({
        ...v,
        price: typeof v.price === "string" ? v.price : String(v.price),
      }))
    );
    setVariants(fresh);
    setDrafts(
      Object.fromEntries(
        fresh.map((v) => [v.id, { size: v.size, price: String(v.price), stock: String(v.stock), unit: v.unit }])
      )
    );
    router.refresh();
  }

  const updateDraft = useCallback((id: string, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    setSaved((prev) => ({ ...prev, [id]: false }));
  }, []);

  async function saveOne(v: Variant) {
    const draft = drafts[v.id];
    setError(null);
    setSaving((prev) => ({ ...prev, [v.id]: true }));
    try {
      await apiJson(`/api/products/${productId}/variants/${v.id}`, {
        method: "PUT",
        body: JSON.stringify({
          size: draft.size,
          price: Number(draft.price),
          stock: Number(draft.stock),
          unit: draft.unit,
        }),
      });
      setSaved((prev) => ({ ...prev, [v.id]: true }));
      setTimeout(() => setSaved((prev) => ({ ...prev, [v.id]: false })), 2000);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving((prev) => ({ ...prev, [v.id]: false }));
    }
  }

  async function saveAll() {
    const dirty = variants.filter((v) => isDirty(v, drafts[v.id]));
    if (dirty.length === 0) return;
    setError(null);
    setSavingAll(true);
    try {
      await Promise.all(dirty.map((v) => saveOne(v)));
    } finally {
      setSavingAll(false);
    }
  }

  async function removeRow(id: string) {
    if (!confirm("Delete this variant?")) return;
    setError(null);
    try {
      await fetch(`/api/products/${productId}/variants/${id}`, { method: "DELETE", credentials: "include" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function addStockArrival(variantId: string, qty: number, costPerUnit: number) {
    setError(null);
    try {
      await apiJson(`/api/products/${productId}/variants/${variantId}`, {
        method: "PATCH",
        body: JSON.stringify({ qty, costPerUnit }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Stock update failed");
    }
  }

  async function addVariant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await apiJson(`/api/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          size: newRow.size.trim(),
          price: Number(newRow.price),
          stock: Number(newRow.stock),
          unit: newRow.unit,
        }),
      });
      setNewRow({ size: "", price: "", stock: "0", unit: "PIECE" });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setAdding(false);
    }
  }

  const dirtyCount = variants.filter((v) => drafts[v.id] && isDirty(v, drafts[v.id])).length;

  return (
    <div className="space-y-4 sm:max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Variant maintenance</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Update sellable rows and inventory</h2>
        </div>
        {dirtyCount > 0 && (
          <button
            type="button"
            onClick={saveAll}
            disabled={savingAll}
            className="btn-primary mt-2 shrink-0 text-xs"
          >
            {savingAll ? "Saving…" : `Save all (${dirtyCount})`}
          </button>
        )}
      </div>
      {error ? <p className="alert-error">{error}</p> : null}

      <div className="table-shell overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[35%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[23%]" />
          </colgroup>
          <thead>
            <tr className="table-head">
              <th className="px-3 py-2.5 font-medium">Size</th>
              <th className="px-3 py-2.5 font-medium">Price</th>
              <th className="px-3 py-2.5 font-medium">Stock</th>
              <th className="px-3 py-2.5 font-medium">Unit</th>
              <th className="px-3 py-2.5 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <VariantRowEditor
                key={v.id}
                v={v}
                draft={drafts[v.id] ?? { size: v.size, price: String(v.price), stock: String(v.stock), unit: v.unit }}
                isSaved={!!saved[v.id]}
                isSaving={!!saving[v.id]}
                isDirty={drafts[v.id] ? isDirty(v, drafts[v.id]) : false}
                onChange={(patch) => updateDraft(v.id, patch)}
                onSave={() => saveOne(v)}
                onDelete={() => removeRow(v.id)}
                onAddStock={addStockArrival}
              />
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={addVariant} className="card-dashboard border-dashed p-5 sm:p-6">
        <p className="section-kicker">Add variant</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,0.8fr))_auto] lg:items-end">
          <input
            required
            placeholder="Size"
            className="input-field-sm min-w-24 flex-1"
            value={newRow.size}
            onChange={(e) => setNewRow((r) => ({ ...r, size: e.target.value }))}
          />
          <input
            type="number"
            step="0.01"
            required
            placeholder="Price"
            className="input-field-sm w-full"
            value={newRow.price}
            onChange={(e) => setNewRow((r) => ({ ...r, price: e.target.value }))}
          />
          <input
            type="number"
            min={0}
            required
            placeholder="Stock"
            className="input-field-sm w-full"
            value={newRow.stock}
            onChange={(e) => setNewRow((r) => ({ ...r, stock: e.target.value }))}
          />
          <select
            className="input-field-sm w-full"
            value={newRow.unit}
            onChange={(e) => setNewRow((r) => ({ ...r, unit: e.target.value as UnitType }))}
          >
            <option value="PIECE">piece</option>
            <option value="METER">meter</option>
            <option value="BOX">box</option>
            <option value="ROLL">roll</option>
          </select>
          <button type="submit" disabled={adding} className="btn-primary h-9 text-xs">
            Add
          </button>
        </div>
      </form>
    </div>
  );
}

function VariantRowEditor({
  v,
  draft,
  isSaved,
  isSaving,
  isDirty,
  onChange,
  onSave,
  onDelete,
  onAddStock,
}: {
  v: Variant;
  draft: RowDraft;
  isSaved: boolean;
  isSaving: boolean;
  isDirty: boolean;
  onChange: (patch: Partial<RowDraft>) => void;
  onSave: () => void;
  onDelete: () => void;
  onAddStock: (variantId: string, qty: number, costPerUnit: number) => void;
}) {
  const [showArrival, setShowArrival] = useState(false);
  const [arrivalQty, setArrivalQty] = useState("");
  const [arrivalCost, setArrivalCost] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitArrival(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(arrivalQty, 10);
    const cost = parseFloat(arrivalCost) || 0;
    if (!qty || qty <= 0) return;
    setSubmitting(true);
    await onAddStock(v.id, qty, cost);
    setArrivalQty("");
    setArrivalCost("");
    setShowArrival(false);
    setSubmitting(false);
  }

  return (
    <>
      <tr className="table-row">
        <td className="px-3 py-2">
          <input className="input-field-sm w-full" value={draft.size} onChange={(e) => onChange({ size: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            className="input-field-sm w-full"
            value={draft.price}
            onChange={(e) => onChange({ price: e.target.value })}
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            min={0}
            className="input-field-sm w-full"
            value={draft.stock}
            onChange={(e) => onChange({ stock: e.target.value })}
          />
        </td>
        <td className="px-3 py-2">
          <select
            className="input-field-sm w-full min-w-20"
            value={draft.unit}
            onChange={(e) => onChange({ unit: e.target.value as UnitType })}
          >
            <option value="PIECE">piece</option>
            <option value="METER">meter</option>
            <option value="BOX">box</option>
            <option value="ROLL">roll</option>
          </select>
        </td>
        <td className="px-3 py-2 text-xs">
          {isSaved ? (
            <span className="font-medium text-green-600">Saved ✓</span>
          ) : (
            <button
              type="button"
              disabled={isSaving || !isDirty}
              className="font-medium text-primary hover:underline disabled:cursor-default disabled:opacity-40"
              onClick={onSave}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          )}
          <span className="mx-1.5 text-muted-foreground">·</span>
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setShowArrival((s) => !s)}
          >
            + Stock
          </button>
          <span className="mx-1.5 text-muted-foreground">·</span>
          <button type="button" className="font-medium text-destructive hover:underline" onClick={onDelete}>
            Delete
          </button>
        </td>
      </tr>
      {showArrival && (
        <tr className="bg-muted/30">
          <td colSpan={5} className="px-3 py-3">
            <form onSubmit={submitArrival} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Qty received</label>
                <input
                  required
                  type="number"
                  min={1}
                  placeholder="e.g. 100"
                  className="input-field-sm w-28"
                  value={arrivalQty}
                  onChange={(e) => setArrivalQty(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Cost per unit</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 4.50"
                  className="input-field-sm w-28"
                  value={arrivalCost}
                  onChange={(e) => setArrivalCost(e.target.value)}
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary h-9 text-xs">
                Confirm arrival
              </button>
              <button
                type="button"
                className="h-9 text-xs text-muted-foreground hover:underline"
                onClick={() => setShowArrival(false)}
              >
                Cancel
              </button>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
