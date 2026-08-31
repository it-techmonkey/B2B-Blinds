"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiJson } from "@/lib/api-client";

type Variant = { id: string; size: string; price: string; stock: number; unit: string };

type ProductRow = {
  id: string;
  code: string | null;
  name: string;
  category: { name: string };
  hasVariants: boolean;
  variants: Variant[];
};

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  businessName: string | null;
  phone: string | null;
};

function compactVariantLabel(v: Variant) {
  const compactSize = v.size
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*[xX]\s*(\d)/g, "$1 x $2")
    .trim();
  return `${compactSize} · $${v.price}/${v.unit.toLowerCase()}`;
}

function buildLinesFromState(products: ProductRow[], quantities: Record<string, number>) {
  const out: { productId: string; variantId: string; quantity: number }[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      const qty = quantities[v.id] ?? 0;
      if (qty <= 0) continue;
      out.push({
        productId: p.id,
        variantId: v.id,
        quantity: qty,
      });
    }
  }
  return out;
}

export function AdminNewOrderClient() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [userId, setUserId] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [sort, setSort] = useState<"code" | "name" | "price">("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [invoicePriceByVariant, setInvoicePriceByVariant] = useState<Record<string, string>>({});
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<string, string>>({});
  const [draftQtyByVariant, setDraftQtyByVariant] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    city: "",
    notes: "",
  });

  const userTouched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [uRes, pRes] = await Promise.all([
          apiJson<{ data: CustomerRow[] }>("/api/admin/users"),
          apiJson<{ data: ProductRow[] }>("/api/products?page=1&limit=500"),
        ]);
        if (cancelled) return;
        setCustomers(uRes.data);
        setProducts(pRes.data);
        const initialSelected: Record<string, string> = {};
        const initialDraft: Record<string, number> = {};
        for (const p of pRes.data) {
          const first = p.variants[0];
          if (first) {
            initialSelected[p.id] = first.id;
            initialDraft[first.id] = 1;
          }
        }
        setSelectedVariantByProduct(initialSelected);
        setDraftQtyByVariant(initialDraft);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const u = customers.find((c) => c.id === userId);
    if (!u) return;
    if (userTouched.current) return;
    setCustomer({
      name: u.name,
      businessName: u.businessName ?? "",
      email: u.email,
      phone: u.phone ?? "",
      city: "",
      notes: "",
    });
  }, [userId, customers]);

  const setQty = useCallback((variantId: string, value: number) => {
    setQuantities((q) => ({ ...q, [variantId]: value }));
  }, []);

  function addOrUpdateLine(product: ProductRow) {
    const picked = selectedVariantByProduct[product.id];
    if (!picked) return;
    const variant = product.variants.find((v) => v.id === picked);
    if (!variant) return;
    const maxStock = variant.stock ?? 0;
    if (maxStock <= 0) return;
    const nextQty = Math.max(1, Math.min(maxStock, Math.floor(draftQtyByVariant[picked] ?? 1)));
    setQty(picked, nextQty);
  }

  const lineCount = useMemo(() => buildLinesFromState(products, quantities).length, [products, quantities]);

  async function submitOrder() {
    if (!userId) {
      setError("Select a client.");
      return;
    }
    const items = buildLinesFromState(products, quantities).map((item) => {
      const rawPrice = invoicePriceByVariant[item.variantId]?.trim() ?? "";
      return { ...item, price: rawPrice === "" ? undefined : Number(rawPrice) };
    });
    if (items.length === 0) {
      setError("Add at least one line.");
      return;
    }
    if (items.some((item) => item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0))) {
      setError("Enter a valid invoice price for each edited line.");
      return;
    }
    if (!customer.name.trim() || !customer.businessName.trim() || !customer.email.trim() || !customer.phone.trim() || !customer.city.trim()) {
      setError("Fill all customer fields including city.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiJson<{ order: { id: string } }>("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          userId,
          items,
          customer: {
            name: customer.name.trim(),
            businessName: customer.businessName.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim(),
            city: customer.city.trim(),
            notes: customer.notes.trim(),
          },
        }),
      });
      router.push(`/admin/orders/${res.order.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  const productsByCategory = useMemo(() => {
    const lowestPrice = (product: ProductRow) => Math.min(...product.variants.map((variant) => Number(variant.price)), Infinity);
    const sorted = [...products].sort((a, b) => {
      const left = sort === "code" ? (a.code ?? "") : sort === "name" ? a.name : lowestPrice(a);
      const right = sort === "code" ? (b.code ?? "") : sort === "name" ? b.name : lowestPrice(b);
      const comparison = typeof left === "string" ? left.localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) : left - Number(right);
      return direction === "asc" ? comparison : -comparison;
    });
    return [["Products", sorted]] as [string, ProductRow[]][];
  }, [products, sort, direction]);

  function toggleSort(key: "code" | "name" | "price") {
    if (sort === key) setDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSort(key); setDirection("asc"); }
  }

  function sortButton(key: "code" | "name" | "price", label: string) {
    return <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">{label}<span aria-hidden="true">{sort === key ? (direction === "asc" ? "↑" : "↓") : "↕"}</span></button>;
  }

  if (loading) {
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

  return (
    <div className="content-stack">
      {error ? <p className="alert-error">{error}</p> : null}

      <section className="card-dashboard p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Client</h2>
        <p className="mt-1 text-xs text-muted-foreground">Order is recorded against this account and reduces variant stock.</p>
        <label className="field-label mt-3 text-xs" htmlFor="admin-client">
          Select client
        </label>
        <select
          id="admin-client"
          className="select-field mt-1.5 w-full max-w-lg"
          value={userId}
          onChange={(e) => {
            userTouched.current = true;
            setUserId(e.target.value);
          }}
        >
          <option value="">— Choose —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} disabled={!c.approved}>
              {c.name} ({c.email}){!c.approved ? " — pending" : ""}
            </option>
          ))}
        </select>
      </section>

      <section className="card-dashboard p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Delivery & invoice (order snapshot)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label text-xs" htmlFor="c-name">
              Contact name
            </label>
            <input
              id="c-name"
              className="input-field-sm mt-1.5"
              value={customer.name}
              onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label text-xs" htmlFor="c-biz">
              Business name
            </label>
            <input
              id="c-biz"
              className="input-field-sm mt-1.5"
              value={customer.businessName}
              onChange={(e) => setCustomer((c) => ({ ...c, businessName: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label text-xs" htmlFor="c-email">
              Email
            </label>
            <input
              id="c-email"
              type="email"
              className="input-field-sm mt-1.5"
              value={customer.email}
              onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="field-label text-xs" htmlFor="c-phone">
              Phone
            </label>
            <input
              id="c-phone"
              className="input-field-sm mt-1.5"
              value={customer.phone}
              onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label text-xs" htmlFor="c-city">
              City / region
            </label>
            <input
              id="c-city"
              className="input-field-sm mt-1.5"
              value={customer.city}
              onChange={(e) => setCustomer((c) => ({ ...c, city: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label text-xs" htmlFor="c-notes">
              Notes
            </label>
            <textarea
              id="c-notes"
              rows={2}
              className="input-field mt-1.5 min-h-[4rem] resize-y py-2"
              value={customer.notes}
              onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3">
          <span className="text-xs text-muted-foreground">Sort products:</span>
          {sortButton("code", "Product code")}
          {sortButton("name", "Product name")}
          {sortButton("price", "Price")}
        </div>
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
                          {p.code ?? "No code"} · {p.category.name} · {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          inCart
                            ? "border-primary/25 bg-primary/10 text-primary"
                            : "border-border/80 bg-muted/55 text-muted-foreground"
                        }`}
                      >
                        {inCart ? `Qty ${currentQty}` : "—"}
                      </span>
                    </div>

                    <div className="rounded-[14px] border border-border/75 bg-muted/25 p-3">
                      <label className="field-label text-xs" htmlFor={`admin-variant-${p.id}`}>
                        Variant (size order)
                      </label>
                      <select
                        id={`admin-variant-${p.id}`}
                        className="input-field-sm mt-1.5 h-10 w-full"
                        value={selectedVariantId}
                        onChange={(e) =>
                          setSelectedVariantByProduct((prev) => ({
                            ...prev,
                            [p.id]: e.target.value,
                          }))
                        }
                      >
                        {p.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {compactVariantLabel(v)}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Stock on hand: {maxStock}</span>
                        <span>
                          {selectedVariant ? `$${selectedVariant.price} / ${selectedVariant.unit.toLowerCase()}` : "—"}
                        </span>
                      </div>
                      <div className="mt-3">
                        <label className="field-label text-xs" htmlFor={`admin-price-${p.id}`}>
                          Invoice price <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <input
                            id={`admin-price-${p.id}`}
                            type="number"
                            min={0}
                            step="0.01"
                            className="input-field-sm h-9 w-full pl-5 text-right"
                            placeholder={selectedVariant ? selectedVariant.price : "0.00"}
                            value={selectedVariant ? invoicePriceByVariant[selectedVariant.id] ?? "" : ""}
                            onChange={(event) => {
                              if (!selectedVariant) return;
                              setInvoicePriceByVariant((previous) => ({ ...previous, [selectedVariant.id]: event.target.value }));
                            }}
                            disabled={!selectedVariant}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Leave blank to use this client&apos;s saved price, or the list price.</p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-end gap-2">
                      <div className="w-24">
                        <label className="field-label text-xs" htmlFor={`admin-qty-${p.id}`}>
                          Qty
                        </label>
                        <input
                          id={`admin-qty-${p.id}`}
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
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary h-10 flex-1"
                        onClick={() => addOrUpdateLine(p)}
                        disabled={!selectedVariant || maxStock <= 0}
                      >
                        {inCart ? "Update line" : "Add line"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{lineCount}</span> line{lineCount === 1 ? "" : "s"} selected
        </p>
        <button type="button" disabled={submitting || lineCount === 0} className="btn-primary w-full sm:w-auto" onClick={submitOrder}>
          {submitting ? "Creating…" : "Create order for client"}
        </button>
      </div>
    </div>
  );
}
