import { DashboardShell } from "@/components/DashboardShell";
import { ProductCreateForm } from "@/components/ProductCreateForm";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";

export default async function NewProductPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/login");
  }
  return (
    <DashboardShell role="ADMIN">
      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <h1 className="dash-title mt-3">New product</h1>
      </section>
      <ProductCreateForm />
    </DashboardShell>
  );
}
