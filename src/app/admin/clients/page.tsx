import { redirect } from "next/navigation";
import { AdminClientsBody } from "@/components/AdminClientsBody";
import { DashboardShell } from "@/components/DashboardShell";
import { getSession } from "@/lib/auth/get-session";

export default async function AdminClientsPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <DashboardShell role="ADMIN">
      <AdminClientsBody />
    </DashboardShell>
  );
}
