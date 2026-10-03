"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/components/ConfirmModal";

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  async function confirmDelete() {
    setLoading(true);
    try {
      await fetch(`/api/products/${productId}`, { method: "DELETE", credentials: "include" });
      setShowModal(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="font-medium text-red-700 transition hover:text-red-900 hover:underline"
        onClick={() => setShowModal(true)}
      >
        Delete
      </button>
      {showModal && (
        <ConfirmModal
          title="Delete product?"
          message="This will permanently remove the product and all its variants. This cannot be undone."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          destructive
          onConfirm={confirmDelete}
          onCancel={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </>
  );
}
