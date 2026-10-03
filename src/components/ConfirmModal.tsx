"use client";

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  loadingLabel,
  destructive = false,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  loadingLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel(); }}
    >
      <div className="card-dashboard w-full max-w-sm space-y-4 p-6 shadow-[0_24px_64px_-12px_rgba(15,24,38,0.32)]">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={loading} className="btn-secondary h-9 px-4 text-sm">
            Cancel
          </button>
          {destructive ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="h-9 rounded-[10px] bg-destructive px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? loadingLabel : confirmLabel}
            </button>
          ) : (
            <button type="button" onClick={onConfirm} disabled={loading} className="btn-primary h-9 px-4 text-sm">
              {loading ? loadingLabel : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
