import { CheckoutClient } from "@/components/CheckoutClient";
import { DashboardShell } from "@/components/DashboardShell";
import { GuestShell } from "@/components/GuestShell";
import { getSession } from "@/lib/auth/get-session";

export default async function CheckoutPage() {
  const session = await getSession();
  const inner = (
    <>
      <section className="card-dashboard mb-6 p-5 sm:p-6">
        <h1 className="dash-title mt-3">Checkout</h1>
      </section>
      <CheckoutClient />
    </>
  );
  if (session?.role === "CUSTOMER") {
    return <DashboardShell role="CUSTOMER">{inner}</DashboardShell>;
  }
  return <GuestShell>{inner}</GuestShell>;
}
