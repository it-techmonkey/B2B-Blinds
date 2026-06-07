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
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [draftQtyByVariant, setDraftQtyByVariant] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const loadedRef = useRef(false);
  const userTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<{ data: ProductRow[] }>("/api/products?page=1&limit=500");
        if (cancelled) return;
        setProducts(res.data);
        const initialSelectedVariant: Record<string, string> = {};
        const initialDraftQty: Record<string, number> = {};
        for (const p of res.data) {
          const firstVariant = p.variants[0];
          if (firstVariant) {
            initialSelectedVariant[p.id] = firstVariant.id;
            initialDraftQty[firstVariant.id] = 1;
          }
        }
        setSelectedVariantByProduct(initialSelectedVariant);
        setDraftQtyByVariant(initialDraftQty);
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
      for (const line of saved.items) {
        const maxStock = variantStockById.get(line.variantId);
        if (typeof maxStock !== "number" || line.quantity <= 0) continue;
        q[line.variantId] = Math.max(0, Math.min(maxStock, line.quantity));
      }
      setQuantities((prev) => ({ ...prev, ...q }));
      setDraftQtyByVariant((prev) => {
        const next = { ...prev };
        for (const [variantId, qty] of Object.entries(q)) {
          next[variantId] = Math.max(1, qty);
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

  function addOrUpdateLine(product: ProductRow) {
    const picked = selectedVariantByProduct[product.id];
    if (!picked) return;
    const variant = product.variants.find((v) => v.id === picked);
    if (!variant) return;
    const maxStock = variant.stock ?? 0;
    if (maxStock <= 0) return;
    const nextQty = Math.max(1, Math.min(maxStock, Math.floor(draftQtyByVariant[picked] ?? 1)));
    userTouched.current = true;
    setQty(picked, nextQty);
  }

  function removeVariantLine(variantId: string) {
    userTouched.current = true;
    setQuantities((prev) => ({ ...prev, [variantId]: 0 }));
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

  const selectedLines = useMemo(() => buildLinesFromState(products, quantities), [products, quantities]);

  function goCart() {
    const items = buildLinesFromState(products, quantities);
    if (items.length === 0) return;
    writeCartPayload({ items });
    router.push("/cart");
  }

  if (loading) {
    return <CatalogSkeleton />;
  }

  if (error) {
    return <p className="alert-error">{error}</p>;
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-6">
        {productsByCategory.map(([categoryName, categoryProducts]) => (
          <section key={categoryName} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">{categoryName}</h2>
              <span className="text-xs text-muted-foreground">{categoryProducts.length} products</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {categoryProducts.map((p) => {
                const selectedVariantId = selectedVariantByProduct[p.id] ?? p.variants[0]?.id ?? "";
                const selectedVariant = p.variants.find((v) => v.id === selectedVariantId) ?? p.variants[0];
                const maxStock = selectedVariant?.stock ?? 0;
                const currentQty = selectedVariant ? quantities[selectedVariant.id] ?? 0 : 0;
                const draftQty = selectedVariant ? draftQtyByVariant[selectedVariant.id] ?? 1 : 1;
                const inCart = currentQty > 0;

                return (
                  <article key={p.id} className="card-dashboard flex h-full flex-col gap-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold leading-5 tracking-[-0.01em] text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.variants.length} variant{p.variants.length === 1 ? "" : "s"} available
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          inCart
                            ? "border-primary/25 bg-primary/10 text-primary"
                            : "border-border/80 bg-muted/55 text-muted-foreground"
                        }`}
                      >
                        {inCart ? `In cart: ${currentQty}` : "Not added"}
                      </span>
                    </div>

                    <div className="rounded-[14px] border border-border/75 bg-muted/25 p-3">
                      <label className="field-label text-xs" htmlFor={`variant-${p.id}`}>
                        Select variant
                      </label>
                      <select
                        id={`variant-${p.id}`}
                        className="input-field-sm mt-1.5 h-10"
                        value={selectedVariantId}
                        onChange={(e) =>
                          setSelectedVariantByProduct((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                        aria-label={`Select variant for ${p.name}`}
                      >
                        {p.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {compactVariantLabel(v)}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Stock: {maxStock}</span>
                        <span>
                          {selectedVariant ? `$${selectedVariant.price} / ${selectedVariant.unit.toLowerCase()}` : "Unavailable"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex items-end gap-2">
                      <div className="w-24">
                        <label className="field-label text-xs" htmlFor={`qty-${p.id}`}>
                          Qty
                        </label>
                        <input
                          id={`qty-${p.id}`}
                          type="number"
                          min={1}
                          max={maxStock}
                          className="input-field-sm mt-1.5 h-10 w-full text-right"
                          value={draftQty}
                          onChange={(e) => {
                            if (!selectedVariant) return;
                            setDraftQtyByVariant((prev) => ({
                              ...prev,
                              [selectedVariant.id]: Math.max(1, Number(e.target.value) || 1),
                            }));
                          }}
                          disabled={maxStock <= 0 || !selectedVariant}
                          aria-label={`Qty for ${p.name}`}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary h-10 flex-1"
                        onClick={() => addOrUpdateLine(p)}
                        disabled={!selectedVariant || maxStock <= 0}
                      >
                        {inCart ? "Update cart" : "Add to cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {cartOpen ? (
        <section className="card-dashboard p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Cart items</h2>
            <button
              type="button"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setCartOpen(false)}
            >
              Hide
            </button>
          </div>
          {selectedLines.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-border/85 bg-muted/25 px-3 py-3 text-sm text-muted-foreground">
              Your cart is empty.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedLines.map((line) => (
                <article
                  key={`${line.productId}-${line.variantId}`}
                  className="flex flex-col gap-2 rounded-[12px] border border-border/80 bg-muted/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{line.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.size} · ${line.price} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums text-foreground">Qty {line.quantity}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      ${(Number(line.price) * line.quantity).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVariantLine(line.variantId)}
                      className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setCartOpen((prev) => !prev)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[12px] border border-border/85 bg-muted/45 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/70 sm:w-auto"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="17" cy="20" r="1" />
                  <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H7.2" />
                </svg>
                <span className="tabular-nums">
                  {selectedLines.length} item{selectedLines.length === 1 ? "" : "s"}
                </span>
              </button>
              <button
                type="button"
                disabled={lineCount === 0}
                onClick={goCart}
                className="btn-primary h-10 w-full sm:w-auto"
              >
                Go to cart
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
