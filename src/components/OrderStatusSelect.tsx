"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STATUSES = ["CREATED", "SHIPPED", "DELIVERED"] as const;

const LABELS: Record<string, string> = {
  CREATED: "Created",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

export function OrderStatusSelect({
  orderId,
  current,
  compact,
}: {
  orderId: string;
  current: string;
  /** Table cell: no label, shorter control */
  compact?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [loading, setLoading] = useState(false);

  async function onChange(next: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Update failed");
      }
      setValue(next);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
      setValue(current);
    } finally {
      setLoading(false);
    }
  }

  const select = (
    <select
      disabled={loading}
      className={
        compact
          ? "input-field-sm h-9 w-[10.5rem] text-xs font-medium"
          : "select-field w-full min-w-[10rem] font-medium"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {LABELS[s] ?? s}
        </option>
      ))}
    </select>
  );

  if (compact) {
    return select;
  }

  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
      Status
      {select}
    </label>
  );
}
