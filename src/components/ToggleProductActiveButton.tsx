"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/api-client";

export function ToggleProductActiveButton({ productId, isActive }: { productId: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await apiJson("/api/products/" + productId, { method: "PUT", body: JSON.stringify({ isActive: !isActive }) });
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not update product");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      title={isActive ? "Hide from client catalog" : "Show in client catalog"}
      className={"font-medium hover:underline disabled:cursor-default disabled:opacity-50 " + (isActive ? "text-amber-700 hover:text-amber-900" : "text-emerald-700 hover:text-emerald-900")}
    >
      {busy ? "Saving…" : isActive ? "Deactivate" : "Activate"}
    </button>
  );
}
