"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";

type Row = {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approved: boolean;
  pricingDiscount: string | null;
  orderCount: number;
  totalSpent: string;
  createdAt: string;
};

type ProductItem = {
  id: string;
  name: string;
  category: { name: string };
  variants: { id: string; size: string; price: string; unit: string }[];
};

type VariantOverride = { variantId: string; price: string };

// ---------------------------------------------------------------------------
// Shared modal shell
// ---------------------------------------------------------------------------
function Modal({
  title,
  onClose,
  wide,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`card-dashboard my-8 w-full space-y-5 p-6 shadow-[0_24px_64px_-12px_rgba(15,24,38,0.32)] ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pricing fields — used inside both ApproveModal and PricingModal
// ---------------------------------------------------------------------------
function PricingFields({
  discount,
  onDiscountChange,
  products,
  loadingProducts,
  overrides,
  onOverrideChange,
  blockedProductIds,
  onToggleBlock,
}: {
  discount: string;
  onDiscountChange: (v: string) => void;
  products: ProductItem[];
  loadingProducts: boolean;
  overrides: VariantOverride[];
  onOverrideChange: (variantId: string, price: string) => void;
  blockedProductIds: Set<string>;
  onToggleBlock: (productId: string) => void;
}) {
  const discountNum = parseFloat(discount);
  const validDiscount = !isNaN(discountNum) && discountNum > 0;

  return (
    <div className="space-y-5">
      {/* Discount % */}
      <div className="space-y-1.5">
        <label htmlFor="pf-discount" className="field-label">
          Global discount %{" "}
          <span className="font-normal text-muted-foreground">(optional — applies to all list prices)</span>
        </label>
        <div className="relative">
          <input
            id="pf-discount"
            type="number"
            min={0}
            max={100}
            step={0.1}
            className="input-field pr-8"
            placeholder="e.g. 15"
            value={discount}
            onChange={(e) => onDiscountChange(e.target.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
        {validDiscount && (
          <p className="text-xs text-muted-foreground">
            All list prices reduced by {discountNum.toFixed(1)}% for this client.
          </p>
        )}
      </div>

      {/* Per-product section */}
      <div className="space-y-2">
        <p className="field-label">
          Per-product settings{" "}
          <span className="font-normal text-muted-foreground">
            — override price per variant or disable a product entirely
          </span>
        </p>

        {loadingProducts ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton-bar h-12" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products found.</p>
        ) : (
          <div className="max-h-85 space-y-2 overflow-y-auto pr-1">
            {products.map((p) => {
              const isBlocked = blockedProductIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isBlocked
                      ? "border-destructive/25 bg-destructive/4"
                      : "border-border/75 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category.name}</p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <span className={isBlocked ? "font-medium text-destructive" : "text-muted-foreground"}>
                        {isBlocked ? "Disabled" : "Enable"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!isBlocked}
                        onClick={() => onToggleBlock(p.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                          isBlocked ? "bg-destructive/70" : "bg-primary"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            isBlocked ? "translate-x-0" : "translate-x-4"
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  {!isBlocked && (
                    <div className="mt-3 space-y-1.5">
                      {p.variants.map((v) => {
                        const existing = overrides.find((o) => o.variantId === v.id);
                        return (
                          <div key={v.id} className="flex items-center gap-2">
                            <span className="w-36 truncate text-xs text-muted-foreground" title={v.size}>
                              {v.size}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              List: ${v.price}
                            </span>
                            <div className="relative ml-auto w-28">
                              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                $
                              </span>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder={v.price}
                                value={existing?.price ?? ""}
                                onChange={(e) => onOverrideChange(v.id, e.target.value)}
                                className="input-field-sm h-8 w-full pl-5 text-right text-xs"
                                aria-label={`Custom price for ${p.name} ${v.size}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {p.variants.length === 0 && (
                        <p className="text-xs text-muted-foreground">No variants.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approve modal
// ---------------------------------------------------------------------------
function ApproveModal({
  client,
  onClose,
  onDone,
}: {
  client: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [discount, setDiscount] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [overrides, setOverrides] = useState<VariantOverride[]>([]);
  const [blockedProductIds, setBlockedProductIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ data: ProductItem[] }>("/api/products?page=1&limit=500")
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  function handleOverrideChange(variantId: string, price: string) {
    setOverrides((prev) => {
      const next = prev.filter((o) => o.variantId !== variantId);
      if (price.trim() !== "") next.push({ variantId, price });
      return next;
    });
  }

  function handleToggleBlock(productId: string) {
    setBlockedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    // clear overrides for this product's variants if blocking
    const p = products.find((x) => x.id === productId);
    if (p && !blockedProductIds.has(productId)) {
      setOverrides((prev) => prev.filter((o) => !p.variants.some((v) => v.id === o.variantId)));
    }
  }

  async function submit() {
    const discountVal = discount.trim() === "" ? null : parseFloat(discount);
    if (discountVal !== null && (isNaN(discountVal) || discountVal < 0 || discountVal > 100)) {
      setError("Discount must be between 0 and 100");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const validOverrides = overrides
        .map((o) => ({ variantId: o.variantId, price: parseFloat(o.price) }))
        .filter((o) => !isNaN(o.price) && o.price >= 0);

      await apiJson(`/api/admin/users/${client.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          discount: discountVal,
          overrides: validOverrides,
          blockedProductIds: Array.from(blockedProductIds),
        }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Approve — ${client.name}`} onClose={onClose} wide>
      <p className="text-sm text-muted-foreground">
        Approving grants <span className="font-medium text-foreground">{client.email}</span> access to sign in.
        Optionally configure pricing before approving.
      </p>

      <PricingFields
        discount={discount}
        onDiscountChange={setDiscount}
        products={products}
        loadingProducts={loadingProducts}
        overrides={overrides}
        onOverrideChange={handleOverrideChange}
        blockedProductIds={blockedProductIds}
        onToggleBlock={handleToggleBlock}
      />

      {error ? <p className="alert-error text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">
          {busy ? "Approving…" : "Approve client"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Pricing modal (for already-approved clients)
// ---------------------------------------------------------------------------
function PricingModal({
  client,
  onClose,
  onDone,
}: {
  client: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [discount, setDiscount] = useState(client.pricingDiscount ?? "");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [overrides, setOverrides] = useState<VariantOverride[]>([]);
  const [blockedProductIds, setBlockedProductIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiJson<{ data: ProductItem[] }>("/api/products?page=1&limit=500"),
      apiJson<{ pricingDiscount: string | null; overrides: { variantId: string; price: string }[]; blockedProductIds: string[] }>(
        `/api/admin/users/${client.id}/pricing`
      ),
    ])
      .then(([productsRes, pricingRes]) => {
        setProducts(productsRes.data);
        if (pricingRes.pricingDiscount) setDiscount(pricingRes.pricingDiscount);
        setOverrides(pricingRes.overrides.map((o) => ({ variantId: o.variantId, price: o.price })));
        setBlockedProductIds(new Set(pricingRes.blockedProductIds));
      })
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [client.id]);

  function handleOverrideChange(variantId: string, price: string) {
    setOverrides((prev) => {
      const next = prev.filter((o) => o.variantId !== variantId);
      if (price.trim() !== "") next.push({ variantId, price });
      return next;
    });
  }

  function handleToggleBlock(productId: string) {
    setBlockedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
    const p = products.find((x) => x.id === productId);
    if (p && !blockedProductIds.has(productId)) {
      setOverrides((prev) => prev.filter((o) => !p.variants.some((v) => v.id === o.variantId)));
    }
  }

  async function submit() {
    const discountVal = discount.toString().trim() === "" ? null : parseFloat(discount.toString());
    if (discountVal !== null && (isNaN(discountVal) || discountVal < 0 || discountVal > 100)) {
      setError("Discount must be between 0 and 100");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const validOverrides = overrides
        .map((o) => ({ variantId: o.variantId, price: parseFloat(o.price) }))
        .filter((o) => !isNaN(o.price) && o.price >= 0);

      await apiJson(`/api/admin/users/${client.id}/pricing`, {
        method: "PUT",
        body: JSON.stringify({
          discount: discountVal,
          overrides: validOverrides,
          blockedProductIds: Array.from(blockedProductIds),
        }),
      });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Pricing — ${client.name}`} onClose={onClose} wide>
      <p className="text-sm text-muted-foreground">
        Configure pricing for <span className="font-medium text-foreground">{client.email}</span>. Per-variant prices
        override the global discount. Disabled products will not appear in the client&apos;s catalog.
      </p>

      <PricingFields
        discount={discount}
        onDiscountChange={setDiscount}
        products={products}
        loadingProducts={loadingProducts}
        overrides={overrides}
        onOverrideChange={handleOverrideChange}
        blockedProductIds={blockedProductIds}
        onToggleBlock={handleToggleBlock}
      />

      {error ? <p className="alert-error text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
          Cancel
        </button>
        <button type="button" disabled={busy} onClick={submit} className="btn-primary h-9 px-4 text-sm">
          {busy ? "Saving…" : "Save pricing"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Reject / Revoke modal
// ---------------------------------------------------------------------------
function RejectModal({
  client,
  onClose,
  onDone,
}: {
  client: Row;
  onClose: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/admin/users/${client.id}/reject`, { method: "POST", body: "{}" });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  const isRevoke = client.status === "APPROVED";

  return (
    <Modal title={isRevoke ? "Revoke access?" : "Reject registration?"} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{client.name}</span> ({client.email}){" "}
        {isRevoke
          ? "will lose access and will not be able to sign in. You can re-approve them later."
          : "will be marked as rejected and will not be able to sign in. You can re-approve them later."}
      </p>

      {error ? <p className="alert-error text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="h-9 rounded-[10px] bg-destructive px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (isRevoke ? "Revoking…" : "Rejecting…") : isRevoke ? "Revoke access" : "Reject registration"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: Row["status"] }) {
  if (status === "APPROVED") {
    return (
      <span className="rounded-full border border-[#d2dfd7] bg-[#e8f1ec] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#355549]">
        Approved
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="rounded-full border border-[#f0d5d5] bg-[#fdf0f0] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8b2222]">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[#e6dccb] bg-[#f5efe5] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a4831]">
      Pending
    </span>
  );
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
function ClientsTable({
  rows,
  onAction,
}: {
  rows: Row[];
  onAction: (action: "approve" | "reject" | "pricing", row: Row) => void;
}) {
  return (
    <div className="table-shell overflow-x-auto">
      <table className="w-full min-w-240 text-sm">
        <thead>
          <tr className="table-head">
            <th className="px-3 py-3 font-medium">Client</th>
            <th className="px-3 py-3 font-medium">Email</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Discount</th>
            <th className="px-3 py-3 text-right font-medium">Orders</th>
            <th className="px-3 py-3 text-right font-medium">Lifetime value</th>
            <th className="px-3 py-3 font-medium">Joined</th>
            <th className="px-3 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="table-row">
              <td className="px-3 py-3 font-semibold text-foreground">{r.name}</td>
              <td className="px-3 py-3 text-muted-foreground">{r.email}</td>
              <td className="px-3 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {r.pricingDiscount && parseFloat(r.pricingDiscount) > 0 ? (
                  <span className="font-medium text-foreground">{parseFloat(r.pricingDiscount).toFixed(1)}% off</span>
                ) : (
                  <span className="text-xs">Standard</span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{r.orderCount}</td>
              <td className="px-3 py-3 text-right font-medium tabular-nums">${r.totalSpent}</td>
              <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString()}
              </td>
              <td className="px-3 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {(r.status === "PENDING" || r.status === "REJECTED") && (
                    <button
                      type="button"
                      onClick={() => onAction("approve", r)}
                      className="btn-secondary h-9 px-3 text-xs"
                    >
                      Approve
                    </button>
                  )}
                  {r.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => onAction("reject", r)}
                      className="h-9 rounded-[10px] border border-destructive/30 bg-destructive/8 px-3 text-xs font-medium text-destructive transition hover:bg-destructive/15"
                    >
                      Reject
                    </button>
                  )}
                  {r.status === "APPROVED" && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAction("pricing", r)}
                        className="btn-secondary h-9 px-3 text-xs"
                      >
                        Pricing
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction("reject", r)}
                        className="h-9 rounded-[10px] border border-destructive/30 bg-destructive/8 px-3 text-xs font-medium text-destructive transition hover:bg-destructive/15"
                      >
                        Revoke
                      </button>
                      <Link href="/admin/orders/new" className="btn-primary h-9 px-3 text-xs">
                        New order
                      </Link>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main body
// ---------------------------------------------------------------------------
export function AdminClientsBody() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: "approve" | "reject" | "pricing"; row: Row } | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await apiJson<{ data: Row[] }>("/api/admin/users");
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function onDone() {
    await load();
    router.refresh();
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Admin operations"
        title="Clients"
        subtitle="Order counts and spend per account. Approve or reject new registrations, and customise pricing per client."
      />

      {error ? <p className="alert-error">{error}</p> : null}

      {loading ? (
        <div className="table-shell p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-bar" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-dashboard px-6 py-14 text-center text-sm text-muted-foreground">
          No client accounts yet.
        </div>
      ) : (
        <ClientsTable rows={rows} onAction={(type, row) => setModal({ type, row })} />
      )}

      {modal?.type === "approve" && (
        <ApproveModal client={modal.row} onClose={() => setModal(null)} onDone={onDone} />
      )}
      {modal?.type === "reject" && (
        <RejectModal client={modal.row} onClose={() => setModal(null)} onDone={onDone} />
      )}
      {modal?.type === "pricing" && (
        <PricingModal client={modal.row} onClose={() => setModal(null)} onDone={onDone} />
      )}
    </div>
  );
}
