"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCartPayload, readCartPayload, type CartLineMeta, writeCartPayload } from "@/lib/cart-storage";

function clampQty(value: number) {
  return Math.max(1, Math.floor(value || 1));
}

export function CartReviewClient() {
  const router = useRouter();
  const [lines, setLines] = useState<CartLineMeta[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const payload = readCartPayload();
    setLines((payload?.items ?? []).filter((item) => item.quantity > 0));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeCartPayload({ items: lines });
  }, [hydrated, lines]);

  const totalUnits = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.price) * line.quantity, 0),
    [lines]
  );

  function setLineQty(variantId: string, quantity: number) {
    setLines((prev) =>
      prev.map((line) => (line.variantId === variantId ? { ...line, quantity: clampQty(quantity) } : line))
    );
  }

  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((line) => line.variantId !== variantId));
  }

  function clearCart() {
    clearCartPayload();
    setLines([]);
  }

  function goCheckout() {
    if (lines.length === 0) return;
    writeCartPayload({ items: lines });
    router.push("/orders/checkout");
  }

  if (lines.length === 0) {
    return (
      <section className="card-dashboard p-8 text-center sm:p-10">
        <p className="text-xl font-semibold tracking-[-0.04em] text-foreground">Your cart is empty</p>
        <p className="mt-2 text-sm text-muted-foreground">Add products from catalog before checkout.</p>
        <button type="button" onClick={() => router.push("/")} className="btn-primary mt-5">
          Back to catalog
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card-dashboard p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Cart items</h2>
          <button type="button" onClick={clearCart} className="btn-ghost h-9 px-3 text-xs">
            Clear cart
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((line) => (
            <article
              key={`${line.productId}-${line.variantId}`}
              className="flex flex-col gap-3 rounded-[14px] border border-border/80 bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{line.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {line.size} · ${line.price} each
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <label className="sr-only" htmlFor={`line-${line.variantId}`}>
                  Quantity
                </label>
                <input
                  id={`line-${line.variantId}`}
                  type="number"
                  min={1}
                  className="input-field-sm h-9 w-20 text-right"
                  value={line.quantity}
                  onChange={(e) => setLineQty(line.variantId, Number(e.target.value))}
                />
                <span className="w-[7rem] text-right text-sm font-semibold tabular-nums text-foreground">
                  ${(Number(line.price) * line.quantity).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(line.variantId)}
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card-dashboard flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border/80 bg-muted/65 px-3 py-1 text-sm font-medium text-foreground">
            {lines.length} item{lines.length === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-border/80 bg-muted/65 px-3 py-1 text-sm font-medium text-foreground">
            {totalUnits} unit{totalUnits === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            ${totalAmount.toFixed(2)} total
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => router.push("/")} className="btn-secondary">
            Continue shopping
          </button>
          <button type="button" onClick={goCheckout} className="btn-primary">
            Proceed to checkout
          </button>
        </div>
      </section>
    </div>
  );
}
