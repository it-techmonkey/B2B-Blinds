"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";

type Variant = { id: string; size: string; unit: string };
type ProductRow = { id: string; name: string; variants: Variant[] };
type CreditNoteRow = {
  id: string;
  creditNoteNumber: string;
  quantity: number;
  reason: string | null;
  createdAt: string;
  product: { name: string };
  variant: { size: string; unit: string };
};

export function IssueProductCreditNoteForm({ clientId }: { clientId: string }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNoteRow[]>([]);
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    const result = await apiJson<{ creditNotes: CreditNoteRow[] }>(`/api/admin/clients/${clientId}/product-credit-notes`);
    setCreditNotes(result.creditNotes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes] = await Promise.all([
          apiJson<{ data: ProductRow[] }>("/api/products?page=1&limit=500"),
          loadHistory(),
        ]);
        if (cancelled) return;
        setProducts(pRes.data);
        const first = pRes.data[0];
        if (first) {
          setProductId(first.id);
          setVariantId(first.variants[0]?.id ?? "");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const selectedProduct = products.find((p) => p.id === productId);

  function selectProduct(id: string) {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    setVariantId(product?.variants[0]?.id ?? "");
  }

  async function submit() {
    const parsedQuantity = Number(quantity);
    if (!productId || !variantId) {
      setError("Choose a product and size.");
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a whole quantity greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/admin/clients/${clientId}/product-credit-notes`, {
        method: "POST",
        body: JSON.stringify({ productId, variantId, quantity: parsedQuantity, reason: reason.trim() || undefined }),
      });
      setQuantity("");
      setReason("");
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue credit note");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  return (
    <section className="card-dashboard p-5 sm:p-6">
      <p className="section-kicker">Stock credit</p>
      <h2 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-foreground">Issue a product credit note</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Credits this client for stock on a specific product. This only adjusts inventory — it does not touch any account balance.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="field-label">Product</span>
          <select className="select-field mt-1.5" value={productId} onChange={(event) => selectProduct(event.target.value)} disabled={busy}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Size</span>
          <select className="select-field mt-1.5" value={variantId} onChange={(event) => setVariantId(event.target.value)} disabled={busy}>
            {selectedProduct?.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.size} ({variant.unit.toLowerCase()})</option>)}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Quantity</span>
          <input type="number" min="1" step="1" className="input-field mt-1.5" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={busy} />
        </label>
        <label className="block">
          <span className="field-label">Reason <span className="font-normal text-muted-foreground">(optional)</span></span>
          <input className="input-field mt-1.5" value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} placeholder="e.g. returned/borrowed stock" />
        </label>
      </div>

      {error ? <p className="alert-error mt-4 text-sm">{error}</p> : null}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={submit} disabled={busy} className="btn-primary h-9 px-4 text-sm">{busy ? "Issuing…" : "Issue credit note"}</button>
      </div>

      {creditNotes.length > 0 ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm font-medium text-foreground">Recent product credit notes</p>
          <ul className="mt-3 space-y-2 text-sm">
            {creditNotes.map((note) => (
              <li key={note.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/45 px-3 py-2">
                <span>
                  <span className="font-mono text-xs text-muted-foreground">{note.creditNoteNumber}</span>{" "}
                  <span className="font-medium text-foreground">{note.product.name}</span>{" "}
                  <span className="text-muted-foreground">({note.variant.size})</span>{" "}
                  <span className="tabular-nums">+{note.quantity}</span>
                  {note.reason ? <span className="text-muted-foreground"> — {note.reason}</span> : null}
                </span>
                <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
