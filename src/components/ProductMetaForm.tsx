"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";

type Category = { id: string; name: string };

export function ProductMetaForm({
  productId,
  initial,
}: {
  productId: string;
  initial: { name: string; categoryId: string; hasVariants: boolean; isActive: boolean };
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(initial.name);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [hasVariants, setHasVariants] = useState(initial.hasVariants);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<{ data: Category[] }>("/api/categories");
        if (!cancelled) setCategories(res.data);
      } catch {
        if (!cancelled) setError("Failed to load categories");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiJson(`/api/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ name, categoryId, hasVariants, isActive }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card-dashboard space-y-5 p-5 sm:max-w-3xl sm:p-6">
      {error ? <p className="alert-error">{error}</p> : null}
      <div>
        <p className="section-kicker">Metadata</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Product settings</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="pm-name">
            Name
          </label>
          <input id="pm-name" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="pm-cat">
            Category
          </label>
          <select
            id="pm-cat"
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
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border/80 bg-muted/55 p-4 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
            checked={hasVariants}
            onChange={(e) => setHasVariants(e.target.checked)}
          />
          <span>
            <span className="block font-medium text-foreground">Multiple variants</span>
            <span className="mt-1 block text-muted-foreground">Keep this enabled when the product sells in several sizes.</span>
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
            <span className="mt-1 block text-muted-foreground">Turn off to pause ordering without losing existing setup.</span>
          </span>
        </label>
      </div>
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
