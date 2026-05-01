import { CatalogCart } from "@/components/CatalogCart";
import { DashboardShell } from "@/components/DashboardShell";
import { GuestShell } from "@/components/GuestShell";
import { PageHeader } from "@/components/PageHeader";
import { getSession } from "@/lib/auth/get-session";

export async function CatalogShopPage() {
  const session = await getSession();
  const isCustomer = session?.role === "CUSTOMER";

  const inner = (
    <>
      <PageHeader
        kicker="Hyde Park Wood catalog"
        title="Catalog"
        subtitle="Fabric lines and hardware for Hyde Park Wood Ltd — variants listed by width (mm). Add lines to your cart and checkout when ready."
      />
      <CatalogCart isCustomer={isCustomer} />
    </>
  );

  if (isCustomer) {
    return <DashboardShell role="CUSTOMER">{inner}</DashboardShell>;
  }
  return <GuestShell>{inner}</GuestShell>;
}
