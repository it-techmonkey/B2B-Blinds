"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function ConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="card-dashboard w-full max-w-sm space-y-4 p-6 shadow-[0_24px_64px_-12px_rgba(15,24,38,0.32)]">
        <div>
          <h2 className="text-base font-semibold text-foreground">Delete product?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This will permanently remove the product and all its variants. This cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary h-9 px-4 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-9 rounded-[10px] bg-destructive px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
          onConfirm={confirmDelete}
          onCancel={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </>
  );
}
