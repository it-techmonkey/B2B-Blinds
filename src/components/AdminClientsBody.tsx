"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api-client";
import { PageHeader } from "@/components/PageHeader";

type Row = {
  id: string;
  name: string;
  email: string;
  approved: boolean;
  orderCount: number;
  totalSpent: string;
  createdAt: string;
};

function ClientsTable({
  rows,
  onApprove,
  busyId,
}: {
  rows: Row[];
  onApprove: (id: string) => void;
  busyId: string | null;
}) {
  return (
    <div className="table-shell overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="table-head">
            <th className="px-3 py-3 font-medium">Client</th>
            <th className="px-3 py-3 font-medium">Email</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 text-right font-medium">Orders</th>
            <th className="px-3 py-3 text-right font-medium">Lifetime value</th>
            <th className="px-3 py-3 font-medium">Joined</th>
            <th className="px-3 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="table-row">
              <td className="px-3 py-3 font-semibold text-foreground">{r.name}</td>
              <td className="px-3 py-3 text-muted-foreground">{r.email}</td>
              <td className="px-3 py-3">
                {r.approved ? (
                  <span className="rounded-full border border-[#d2dfd7] bg-[#e8f1ec] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#355549]">
                    Approved
                  </span>
                ) : (
                  <span className="rounded-full border border-[#e6dccb] bg-[#f5efe5] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a4831]">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">{r.orderCount}</td>
              <td className="px-3 py-3 text-right font-medium tabular-nums">${r.totalSpent}</td>
              <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
              <td className="px-3 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {!r.approved ? (
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => onApprove(r.id)}
                      className="btn-secondary h-9 px-3 text-xs"
                    >
                      {busyId === r.id ? "Approving…" : "Approve"}
                    </button>
                  ) : null}
                  <Link href="/admin/orders/new" className="btn-primary h-9 px-3 text-xs">
                    New order
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminClientsBody() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await apiJson<{ data: Row[] }>("/api/admin/users");
      setRows(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      await apiJson(`/api/admin/users/${id}/approve`, { method: "POST", body: "{}" });
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="content-stack">
      <PageHeader
        kicker="Admin operations"
        title="Clients"
        subtitle="Order counts and spend per account. Approve new registrations before they can sign in."
      />

      {error ? <p className="alert-error">{error}</p> : null}

      {loading ? (
        <div className="table-shell p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton-bar" />
            ))}
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-dashboard px-6 py-14 text-center text-sm text-muted-foreground">No client accounts yet.</div>
      ) : (
        <ClientsTable rows={rows} onApprove={onApprove} busyId={busyId} />
      )}
    </div>
  );
}
