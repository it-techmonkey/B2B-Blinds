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

function VariantPicker({
  productId,
  options,
  value,
  onChange,
}: {
  productId: string;
  options: Variant[];
  value: string;
  onChange: (nextId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => compactVariantLabel(opt).toLowerCase().includes(q));
  }, [options, query]);

  const current = options.find((x) => x.id === value) ?? options[0];

  return (
    <div ref={wrapRef} className="relative w-full md:max-w-[280px]">
      <button
        type="button"
        className="variant-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`variant-list-${productId}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{current ? compactVariantLabel(current) : "Select variant"}</span>
        <span className="text-muted-foreground" aria-hidden>
          ▼
        </span>
      </button>
      {open ? (
        <div className="variant-menu">
          <input
            type="search"
            className="input-field-sm mb-2 h-9 w-full text-xs"
            placeholder="Filter variant..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div id={`variant-list-${productId}`} role="listbox" className="max-h-48 overflow-auto pr-0.5">
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={opt.id === current?.id}
                className={`variant-option ${opt.id === current?.id ? "bg-muted/80 font-medium" : ""}`}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {compactVariantLabel(opt)}
              </button>
            ))}
            {filtered.length === 0 ? <p className="px-2 py-1.5 text-xs text-muted-foreground">No matches</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildLinesFromState(
  products: ProductRow[],
  quantities: Record<string, number>,
  selectedVariant: Record<string, string>,
  soleVariantByProduct: Record<string, string>
): CartLineMeta[] {
  const out: CartLineMeta[] = [];
  for (const p of products) {
    const vid = p.hasVariants ? selectedVariant[p.id] : soleVariantByProduct[p.id];
    if (!vid) continue;
    const qty = quantities[vid] ?? 0;
    if (qty <= 0) continue;
    const v = p.variants.find((x) => x.id === vid);
    if (!v) continue;
    out.push({
      productId: p.id,
      variantId: vid,
      quantity: qty,
      productName: p.name,
      size: v.size,
      price: v.price,
    });
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

export function CatalogCart() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const loadedRef = useRef(false);
  const userTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiJson<{ data: ProductRow[] }>("/api/products?page=1&limit=200");
        if (cancelled) return;
        setProducts(res.data);
        const sel: Record<string, string> = {};
        for (const p of res.data) {
          if (p.hasVariants && p.variants[0]) sel[p.id] = p.variants[0].id;
        }
        setSelectedVariant(sel);
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

  const soleVariantByProduct = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of products) {
      if (!p.hasVariants && p.variants[0]) m[p.id] = p.variants[0].id;
    }
    return m;
  }, [products]);

  const persist = useCallback(
    (q: Record<string, number>, sel: Record<string, string>) => {
      if (!products.length) return;
      const items = buildLinesFromState(products, q, sel, soleVariantByProduct);
      writeCartPayload({ items });
    },
    [products, soleVariantByProduct]
  );

  useEffect(() => {
    if (!products.length || loadedRef.current) return;
    loadedRef.current = true;
    const saved = readCartPayload();
    if (saved?.items?.length) {
      const validVariantIds = new Set(products.flatMap((p) => p.variants.map((v) => v.id)));
      const q: Record<string, number> = {};
      for (const line of saved.items) {
        if (validVariantIds.has(line.variantId) && line.quantity > 0) {
          q[line.variantId] = line.quantity;
        }
      }
      setQuantities((prev) => ({ ...prev, ...q }));
      setSelectedVariant((prev) => {
        const sel = { ...prev };
        for (const p of products) {
          if (!p.hasVariants) continue;
          const hit = saved.items.find((i) => i.productId === p.id);
          if (hit && p.variants.some((v) => v.id === hit.variantId)) {
            sel[p.id] = hit.variantId;
          }
        }
        return sel;
      });
    }
  }, [products]);

  useEffect(() => {
    if (!products.length || !userTouched.current) return;
    persist(quantities, selectedVariant);
  }, [products, quantities, selectedVariant, persist]);

  function setQty(variantId: string, value: number) {
    userTouched.current = true;
    setQuantities((q) => ({ ...q, [variantId]: value }));
  }

  const lineCount = useMemo(() => {
    return buildLinesFromState(products, quantities, selectedVariant, soleVariantByProduct).length;
  }, [products, quantities, selectedVariant, soleVariantByProduct]);

  function goCheckout() {
    const items = buildLinesFromState(products, quantities, selectedVariant, soleVariantByProduct);
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
    <div className="space-y-4">
      <div className="card-dashboard flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="section-kicker">Current cart</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border/80 bg-muted/65 px-3 py-1 font-medium text-foreground">
              {lineCount} line{lineCount === 1 ? "" : "s"}
            </span>
            <span>Choose variants and quantities before proceeding to checkout.</span>
          </div>
        </div>
        <button type="button" disabled={lineCount === 0} onClick={goCheckout} className="btn-primary w-full sm:w-auto">
          Continue to checkout
        </button>
      </div>

      <div className="space-y-3 md:hidden">
        {products.map((p) => {
          const vid = p.hasVariants ? selectedVariant[p.id] : soleVariantByProduct[p.id];
          const v = p.variants.find((x) => x.id === vid) ?? p.variants[0];
          const maxStock = v?.stock ?? 0;
          return (
            <article key={p.id} className="card-dashboard space-y-4 p-4">
              <div className="space-y-1">
                <p className="text-base font-semibold tracking-[-0.03em] text-foreground">{p.name}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{p.category.name}</p>
              </div>

              <div className="space-y-2">
                <p className="section-kicker">Variant</p>
                {p.hasVariants ? (
                  <VariantPicker
                    productId={p.id}
                    options={p.variants}
                    value={selectedVariant[p.id] ?? ""}
                    onChange={(next) => {
                      userTouched.current = true;
                      setSelectedVariant((s) => ({ ...s, [p.id]: next }));
                      setQuantities((q) => {
                        const copy = { ...q };
                        if (vid) {
                          delete copy[vid];
                        }
                        return copy;
                      });
                    }}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">{v ? compactVariantLabel(v) : "—"}</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[18px] border border-border/80 bg-muted/55 p-3 text-xs">
                <div>
                  <p className="section-kicker">Price</p>
                  <p className="mt-1 font-semibold text-foreground">${v?.price ?? "—"}</p>
                </div>
                <div>
                  <p className="section-kicker">Stock</p>
                  <p className="mt-1 font-semibold text-foreground tabular-nums">{maxStock}</p>
                </div>
                <label className="justify-self-end text-right">
                  <span className="section-kicker">Qty</span>
                  <input
                    type="number"
                    min={0}
                    max={maxStock}
                    className="qty-input mt-1 w-[4.4rem]"
                    value={vid ? (quantities[vid] ?? 0) : 0}
                    onChange={(e) => vid && setQty(vid, Math.max(0, Math.min(maxStock, Number(e.target.value) || 0)))}
                    disabled={!vid}
                    aria-label={`Qty ${p.name}`}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden md:block">
        <div className="table-shell overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="table-head-enterprise">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Variant</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Stock</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const vid = p.hasVariants ? selectedVariant[p.id] : soleVariantByProduct[p.id];
                const v = p.variants.find((x) => x.id === vid) ?? p.variants[0];
                const maxStock = v?.stock ?? 0;
                return (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3">
                      <p className="font-medium leading-6">{p.name}</p>
                    </td>
                    <td className="px-4 py-3 text-sm leading-6 text-muted-foreground">{p.category.name}</td>
                    <td className="px-4 py-3">
                      {p.hasVariants ? (
                        <VariantPicker
                          productId={p.id}
                          options={p.variants}
                          value={selectedVariant[p.id] ?? ""}
                          onChange={(next) => {
                            userTouched.current = true;
                            setSelectedVariant((s) => ({ ...s, [p.id]: next }));
                            setQuantities((q) => {
                              const copy = { ...q };
                              if (vid) {
                                delete copy[vid];
                              }
                              return copy;
                            });
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{v ? compactVariantLabel(v) : "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">${v?.price ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{maxStock}</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={maxStock}
                        className="qty-input"
                        value={vid ? (quantities[vid] ?? 0) : 0}
                        onChange={(e) => vid && setQty(vid, Math.max(0, Math.min(maxStock, Number(e.target.value) || 0)))}
                        disabled={!vid}
                        aria-label={`Qty ${p.name}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
