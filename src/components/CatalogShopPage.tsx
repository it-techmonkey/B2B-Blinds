import { CatalogCart } from "@/components/CatalogCart";
import { DashboardShell } from "@/components/DashboardShell";
import { GuestShell } from "@/components/GuestShell";
import { getSession } from "@/lib/auth/get-session";

export async function CatalogShopPage() {
  const session = await getSession();
  const isCustomer = session?.role === "CUSTOMER";

  const inner = (
    <>
      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <h1 className="dash-title">Catalog</h1>
      </section>
      <CatalogCart />
    </>
  );

  if (isCustomer) {
    return <DashboardShell role="CUSTOMER">{inner}</DashboardShell>;
  }
  return <GuestShell>{inner}</GuestShell>;
}
