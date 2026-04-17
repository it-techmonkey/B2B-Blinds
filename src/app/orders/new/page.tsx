import { redirect } from "next/navigation";

/** Build cart on the home catalog, then checkout at /orders/checkout */
export default function OrdersNewRedirect() {
  redirect("/");
}
