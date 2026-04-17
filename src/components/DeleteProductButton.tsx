"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      className="font-medium text-red-700 transition hover:text-red-900 hover:underline disabled:opacity-50"
      onClick={async () => {
        if (!confirm("Delete this product?")) return;
        setLoading(true);
        try {
          await fetch(`/api/products/${productId}`, { method: "DELETE", credentials: "include" });
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
