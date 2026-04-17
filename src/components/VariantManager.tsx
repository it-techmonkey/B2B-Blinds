"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

type Variant = {
  id: string;
  size: string;
  price: string;
  stock: number;
  unit: "PIECE" | "METER";
};

export function VariantManager({ productId, initial }: { productId: string; initial: Variant[] }) {
  const router = useRouter();
  const [variants, setVariants] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<{ size: string; price: string; stock: string; unit: "PIECE" | "METER" }>({
    size: "",
    price: "",
    stock: "0",
    unit: "PIECE",
  });

  async function refresh() {
    const res = await apiJson<{ product: { variants: Variant[] } }>(`/api/products/${productId}`);
    setVariants(
      res.product.variants.map((v) => ({
        ...v,
        price: typeof v.price === "string" ? v.price : String(v.price),
      }))
    );
    router.refresh();
  }

  async function saveRow(v: Variant) {
    setError(null);
    try {
      await apiJson(`/api/products/${productId}/variants/${v.id}`, {
        method: "PUT",
        body: JSON.stringify({
          size: v.size,
          price: Number(v.price),
          stock: v.stock,
          unit: v.unit,
        }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
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

  return (
    <div className="space-y-4 sm:max-w-5xl">
      <div>
        <p className="section-kicker">Variant maintenance</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Update sellable rows and inventory</h2>
      </div>
      {error ? <p className="alert-error">{error}</p> : null}

      <div className="table-shell overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-3 py-2.5 font-medium">Size</th>
              <th className="px-3 py-2.5 text-right font-medium">Price</th>
              <th className="px-3 py-2.5 text-right font-medium">Stock</th>
              <th className="px-3 py-2.5 font-medium">Unit</th>
              <th className="px-3 py-2.5 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <VariantRowEditor key={v.id} v={v} onSave={saveRow} onDelete={() => removeRow(v.id)} />
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
            className="input-field-sm min-w-[6rem] flex-1"
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
            onChange={(e) => setNewRow((r) => ({ ...r, unit: e.target.value as "PIECE" | "METER" }))}
          >
            <option value="PIECE">piece</option>
            <option value="METER">meter</option>
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
  onSave,
  onDelete,
}: {
  v: Variant;
  onSave: (v: Variant) => void;
  onDelete: () => void;
}) {
  const [size, setSize] = useState(v.size);
  const [price, setPrice] = useState(typeof v.price === "string" ? v.price : String(v.price));
  const [stock, setStock] = useState(String(v.stock));
  const [unit, setUnit] = useState<"PIECE" | "METER">(v.unit);

  return (
    <tr className="table-row">
      <td className="px-3 py-2">
        <input className="input-field-sm w-full" value={size} onChange={(e) => setSize(e.target.value)} />
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          step="0.01"
          className="input-field-sm w-24 text-right"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          min={0}
          className="input-field-sm w-20 text-right"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <select
          className="input-field-sm w-full min-w-[5rem]"
          value={unit}
          onChange={(e) => setUnit(e.target.value as "PIECE" | "METER")}
        >
          <option value="PIECE">piece</option>
          <option value="METER">meter</option>
        </select>
      </td>
      <td className="px-3 py-2 text-right text-xs">
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => onSave({ ...v, size, price, stock: Number(stock), unit })}
        >
          Save
        </button>
        <span className="mx-1.5 text-muted-foreground">·</span>
        <button type="button" className="font-medium text-destructive hover:underline" onClick={onDelete}>
          Delete
        </button>
      </td>
    </tr>
  );
}
