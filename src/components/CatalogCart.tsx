"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiJson } from "@/lib/api-client";
import { readCartPayload, writeCartPayload, type CartLineMeta } from "@/lib/cart-storage";

type Variant = { id: string; size: string; price: string; stock: number; unit: string };

type ProductRow = {
  id: string;
  name: string;
  category: { name: string };
  hasVariants: boolean;
  variants: Variant[];
};

function compactVariantLabel(v: Variant) {
  const compactSize = v.size
    .replace(/\s+/g, " ")
    .replace(/\s*[xX]\s*/g, " x ")
    .trim();
  return `${compactSize} · $${v.price}/${v.unit.toLowerCase()}`;
}

function buildLinesFromState(products: ProductRow[], quantities: Record<string, number>): CartLineMeta[] {
  const out: CartLineMeta[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const qty = quantities[v.id] ?? 0;
      if (qty <= 0) continue;
      out.push({
        productId: p.id,
        variantId: v.id,
        quantity: qty,
        productName: p.name,
        size: v.size,
        price: v.price,
      });
    }
  }
  return out;
}

function CatalogSkeleton() {
  return (
    <div className="table-shell p-4 sm:p-5">
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-bar" />
        ))}
      </div>
    </div>
  );
}

export function CatalogCart({ isCustomer = false }: { isCustomer?: boolean }) {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [activeVariants, setActiveVariants] = useState<Record<string, string[]>>({});
  const [pickerVariant, setPickerVariant] = useState<Record<string, string>>({});
  const loadedRef = useRef(false);
  const userTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<{ data: ProductRow[] }>("/api/products?page=1&limit=200");
        if (cancelled) return;
        setProducts(res.data);
        const initialActive: Record<string, string[]> = {};
        const initialPicker: Record<string, string> = {};
        for (const p of res.data) {
          initialActive[p.id] = [];
          initialPicker[p.id] = "";
        }
        setActiveVariants(initialActive);
        setPickerVariant(initialPicker);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((q: Record<string, number>) => {
    if (!products.length) return;
    const items = buildLinesFromState(products, q);
    writeCartPayload({ items });
  }, [products]);

  useEffect(() => {
    if (!products.length || loadedRef.current) return;
    loadedRef.current = true;
    const saved = readCartPayload();
    if (saved?.items?.length) {
      const variantStockById = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, v.stock] as const)));
      const q: Record<string, number> = {};
      const savedByProduct: Record<string, Set<string>> = {};
      for (const line of saved.items) {
        const maxStock = variantStockById.get(line.variantId);
        if (typeof maxStock !== "number" || line.quantity <= 0) continue;
        q[line.variantId] = Math.max(0, Math.min(maxStock, line.quantity));
        if (!savedByProduct[line.productId]) savedByProduct[line.productId] = new Set();
        savedByProduct[line.productId].add(line.variantId);
      }
      setQuantities((prev) => ({ ...prev, ...q }));
      setActiveVariants((prev) => {
        const next = { ...prev };
        for (const p of products) {
          const base = new Set(next[p.id] ?? []);
          const hits = savedByProduct[p.id];
          if (hits) {
            for (const variantId of hits) {
              if (p.variants.some((v) => v.id === variantId)) {
                base.add(variantId);
              }
            }
          }
          next[p.id] = Array.from(base);
        }
        return next;
      });
    }
  }, [products]);

  useEffect(() => {
    if (!products.length || !userTouched.current) return;
    persist(quantities);
  }, [products, quantities, persist]);

  function setQty(variantId: string, value: number) {
    userTouched.current = true;
    setQuantities((q) => ({ ...q, [variantId]: value }));
  }

  function addVariantLine(product: ProductRow) {
    const picked = pickerVariant[product.id];
    if (!picked) return;
    userTouched.current = true;
    setActiveVariants((prev) => {
      const current = prev[product.id] ?? [];
      if (current.includes(picked)) return prev;
      return { ...prev, [product.id]: [...current, picked] };
    });
  }

  function removeVariantLine(productId: string, variantId: string) {
    userTouched.current = true;
    setQuantities((prev) => ({ ...prev, [variantId]: 0 }));
    setActiveVariants((prev) => {
      const current = prev[productId] ?? [];
      return { ...prev, [productId]: current.filter((id) => id !== variantId) };
    });
  }

  const lineCount = useMemo(() => {
    return buildLinesFromState(products, quantities).length;
  }, [products, quantities]);

  const totalUnits = useMemo(() => {
    return Object.values(quantities).reduce((sum, qty) => sum + (qty > 0 ? qty : 0), 0);
  }, [quantities]);

  const estimatedTotal = useMemo(() => {
    let sum = 0;
    for (const p of products) {
      for (const v of p.variants) {
        const qty = quantities[v.id] ?? 0;
        if (qty > 0) sum += Number(v.price) * qty;
      }
    }
    return sum;
  }, [products, quantities]);

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, ProductRow[]>();
    for (const product of products) {
      const key = product.category.name;
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(product);
      } else {
        grouped.set(key, [product]);
      }
    }
    return Array.from(grouped.entries());
  }, [products]);

  function goCheckout() {
    const items = buildLinesFromState(products, quantities);
    if (items.length === 0) return;
    writeCartPayload({ items });
    router.push("/orders/checkout");
  }

  if (loading) {
    return <CatalogSkeleton />;
  }

  if (error) {
    return <p className="alert-error">{error}</p>;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="card-dashboard flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="section-kicker">Cart</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/80 bg-muted/65 px-3 py-1 font-medium text-foreground">
              {lineCount} line{lineCount === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-border/80 bg-muted/65 px-3 py-1 font-medium text-foreground">
              {totalUnits} unit{totalUnits === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <button type="button" disabled={lineCount === 0} onClick={goCheckout} className="btn-primary w-full sm:w-auto">
          Continue to checkout
        </button>
      </div>

      <div className="space-y-5">
        {productsByCategory.map(([categoryName, categoryProducts]) => (
          <section key={categoryName} className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{categoryName}</h2>
            <div className="card-dashboard divide-y divide-border/70">
              {categoryProducts.map((p) => {
                const shownVariantIds = activeVariants[p.id] ?? [];
                const shownVariants = shownVariantIds
                  .map((id) => p.variants.find((v) => v.id === id))
                  .filter((v): v is Variant => Boolean(v));
                const hiddenOptions = p.variants.filter((v) => !shownVariantIds.includes(v.id));
                const hasAnyLine = shownVariants.length > 0;

                return (
                  <article key={p.id} className="space-y-4 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold tracking-[-0.01em] text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.variants.length} variant{p.variants.length === 1 ? "" : "s"} available
                        </p>
                      </div>
                      <span className="rounded-full border border-border/80 bg-muted/55 px-2.5 py-1 text-xs font-medium text-foreground">
                        {shownVariants.length} selected
                      </span>
                    </div>

                    {p.hasVariants ? (
                      <div className="rounded-[14px] border border-border/80 bg-muted/30 p-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className="input-field-sm h-9 flex-1"
                          value={pickerVariant[p.id] ?? ""}
                          onChange={(e) => setPickerVariant((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          disabled={hiddenOptions.length === 0}
                          aria-label={`Select variant for ${p.name}`}
                        >
                          <option value="">{hiddenOptions.length === 0 ? "All variants already added" : "Choose a variant to add"}</option>
                          {hiddenOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                              {compactVariantLabel(v)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-secondary h-9 px-3 text-xs"
                          onClick={() => addVariantLine(p)}
                          disabled={hiddenOptions.length === 0 || !pickerVariant[p.id]}
                        >
                          Add variant
                        </button>
                        </div>
                      </div>
                    ) : null}

                    {hasAnyLine ? (
                      <div className="table-shell overflow-x-auto">
                        <table className="w-full min-w-[620px] text-sm">
                          <thead>
                            <tr className="table-head">
                              <th className="px-3 py-2.5 font-medium">Variant</th>
                              <th className="px-3 py-2.5 text-right font-medium">Price</th>
                              <th className="px-3 py-2.5 text-right font-medium">Stock</th>
                              <th className="px-3 py-2.5 text-right font-medium">Qty</th>
                              <th className="px-3 py-2.5 text-right font-medium">Line total</th>
                              {p.hasVariants ? <th className="px-3 py-2.5 text-right font-medium">Action</th> : null}
                            </tr>
                          </thead>
                          <tbody>
                            {shownVariants.map((v) => {
                              const maxStock = v.stock ?? 0;
                              const rowTotal = Number(v.price) * (quantities[v.id] ?? 0);
                              return (
                                <tr key={v.id} className="table-row">
                                  <td className="px-3 py-2.5 text-foreground">{compactVariantLabel(v)}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums">${v.price}</td>
                                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{maxStock}</td>
                                  <td className="px-3 py-2.5 text-right">
                                    <input
                                      type="number"
                                      min={0}
                                      max={maxStock}
                                      className="qty-input h-9 w-[4.8rem]"
                                      value={quantities[v.id] ?? 0}
                                      onChange={(e) =>
                                        setQty(v.id, Math.max(0, Math.min(maxStock, Number(e.target.value) || 0)))
                                      }
                                      disabled={maxStock <= 0}
                                      aria-label={`Qty ${p.name} ${v.size}`}
                                    />
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">${rowTotal.toFixed(2)}</td>
                                  {p.hasVariants ? (
                                    <td className="px-3 py-2.5 text-right">
                                      <button
                                        type="button"
                                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                                        onClick={() => removeVariantLine(p.id, v.id)}
                                      >
                                        Remove
                                      </button>
                                    </td>
                                  ) : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-[14px] border border-dashed border-border/80 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                        No variant selected yet. Choose a size from the dropdown and click "Add variant" to start.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className={`fixed bottom-4 right-4 left-4 z-30 ${isCustomer ? "md:left-[calc(15rem+1.5rem)]" : "md:left-6"}`}>
        <div className="rounded-[16px] border border-border bg-white/95 px-4 py-3 shadow-[0_22px_40px_-28px_rgba(15,24,38,0.38)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/80 bg-muted/60 px-2.5 py-1 font-medium text-foreground">
                {lineCount} selected variant{lineCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-border/80 bg-muted/60 px-2.5 py-1 font-medium text-foreground">
                Total quantity: {totalUnits}
              </span>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-semibold text-primary">
                ${estimatedTotal.toFixed(2)} estimated total
              </span>
            </div>
            <button
              type="button"
              disabled={lineCount === 0}
              onClick={goCheckout}
              className="btn-primary h-10 w-full sm:w-auto"
            >
              Continue to checkout
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
