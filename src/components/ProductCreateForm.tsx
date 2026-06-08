"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";

type Category = { id: string; name: string };

type VariantRow = { size: string; price: string; stock: string; unit: "PIECE" | "METER" | "BOX" | "ROLL" };

const emptyVariant = (): VariantRow => ({ size: "", price: "", stock: "0", unit: "PIECE" });

export function ProductCreateForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<VariantRow[]>([
    { size: "Standard", price: "", stock: "0", unit: "PIECE" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<{ data: Category[] }>("/api/categories");
        if (!cancelled) {
          setCategories(res.data);
          if (res.data[0]) setCategoryId(res.data[0].id);
        }
      } catch {
        if (!cancelled) setError("Failed to load categories");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onToggleHasVariants(next: boolean) {
    setHasVariants(next);
    if (next) {
      setVariants((prev) => (prev.length >= 2 ? prev : [emptyVariant(), emptyVariant()]));
    } else {
      setVariants([{ size: "Standard", price: "", stock: "0", unit: "PIECE" }]);
    }
  }

  function updateVariant(i: number, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function addVariantRow() {
    setVariants((rows) => [...rows, emptyVariant()]);
  }

  function removeVariantRow(index: number) {
    setVariants((rows) => {
      if (rows.length <= 2) return rows;
      return rows.filter((_, i) => i !== index);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const vPayload = variants.map((r) => ({
        size: r.size.trim(),
        price: Number(r.price),
        stock: Number(r.stock),
        unit: r.unit,
      }));
      if (vPayload.some((r) => !r.size || Number.isNaN(r.price) || Number.isNaN(r.stock))) {
        setError("Fill size, price, stock for every row");
        setLoading(false);
        return;
      }
      await apiJson("/api/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          categoryId,
          hasVariants,
          isActive,
          variants: vPayload,
        }),
      });
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="card-dashboard p-5 sm:p-6">
        <p className="section-kicker">Product metadata</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="pc-name">
              Name
            </label>
            <input id="pc-name" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="pc-cat">
              Category
            </label>
            <select
              id="pc-cat"
              required
              className="select-field mt-1.5 w-full"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border/80 bg-muted/55 p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
              checked={hasVariants}
              onChange={(e) => onToggleHasVariants(e.target.checked)}
            />
            <span>
              <span className="block font-medium text-foreground">Multiple variants</span>
              <span className="mt-1 block text-muted-foreground">Use two or more rows for size-based pricing and inventory.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border/80 bg-muted/55 p-4 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>
              <span className="block font-medium text-foreground">Active in catalog</span>
              <span className="mt-1 block text-muted-foreground">Inactive products stay editable but hidden from customer ordering.</span>
            </span>
          </label>
        </div>
      </section>

      <section className="card-dashboard p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">{hasVariants ? "Variant matrix" : "Price and stock"}</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">
              {hasVariants ? "Set up every sellable variant." : "Define the single sellable row."}
            </h2>
          </div>
          {hasVariants ? (
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={addVariantRow}>
              Add row
            </button>
          ) : null}
        </div>

        <div className="mt-5 space-y-3 rounded-[22px] border border-border/80 bg-muted/45 p-4">
          {variants.map((row, i) => (
            <div key={i} className="rounded-[18px] border border-border/70 bg-white/70 p-4">
              <div className="grid gap-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-4">
                  <label className="helper-text">Size</label>
                  <input
                    required
                    className="input-field-sm mt-1 w-full"
                    value={row.size}
                    onChange={(e) => updateVariant(i, { size: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="helper-text">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input-field-sm mt-1 w-full"
                    value={row.price}
                    onChange={(e) => updateVariant(i, { price: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="helper-text">Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="input-field-sm mt-1 w-full"
                    value={row.stock}
                    onChange={(e) => updateVariant(i, { stock: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="helper-text">Unit</label>
                  <select
                    className="input-field-sm mt-1 w-full"
                    value={row.unit}
                    onChange={(e) => updateVariant(i, { unit: e.target.value as "PIECE" | "METER" | "BOX" | "ROLL" })}
                  >
                    <option value="PIECE">piece</option>
                    <option value="METER">meter</option>
                    <option value="BOX">box</option>
                    <option value="ROLL">roll</option>
                  </select>
                </div>
                <div className="sm:col-span-1 sm:text-right">
                  {hasVariants && variants.length > 2 ? (
                    <button type="button" className="btn-ghost h-9 w-full text-xs sm:w-auto" onClick={() => removeVariantRow(i)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Saving…" : "Create"}
        </button>
        <button type="button" className="btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
