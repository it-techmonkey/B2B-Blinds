const LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const c = status === "PAID" ? "badge-delivered" : "badge-created";
  const label = LABELS[status] ?? status;
  return <span className={`badge ${c}`}>{label}</span>;
}
