export function OrderStatusBadge({ status }: { status: string }) {
  const c =
    status === "CREATED"
      ? "badge-created"
      : status === "CONFIRMED"
        ? "badge-confirmed"
        : status === "COMPLETED"
          ? "badge-completed"
          : "badge-neutral";
  return <span className={`badge ${c}`}>{status}</span>;
}
