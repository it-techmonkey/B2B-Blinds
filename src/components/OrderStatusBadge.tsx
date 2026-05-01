const LABELS: Record<string, string> = {
  CREATED: "Created",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const c =
    status === "CREATED"
      ? "badge-created"
      : status === "SHIPPED"
        ? "badge-shipped"
        : status === "DELIVERED"
          ? "badge-delivered"
          : "badge-neutral";
  const label = LABELS[status] ?? status;
  return <span className={`badge ${c}`}>{label}</span>;
}
