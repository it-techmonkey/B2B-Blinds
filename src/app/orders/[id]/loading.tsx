import { DashboardShell } from "@/components/DashboardShell";

export default function OrderDetailLoading() {
  return (
    <DashboardShell role="CUSTOMER">
      <div className="skeleton-bar mb-4 h-4 w-24" />
      <div className="card-dashboard mt-4 space-y-4 p-6">
        <div className="flex flex-wrap justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton-bar h-6 w-32" />
            <div className="skeleton-bar h-4 w-48" />
            <div className="skeleton-bar h-4 w-40" />
          </div>
          <div className="skeleton-bar h-9 w-28" />
        </div>
        <div className="skeleton-bar mt-6 h-48 w-full" />
      </div>
    </DashboardShell>
  );
}
