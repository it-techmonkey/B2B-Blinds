"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Shown after checkout; cleans `?placed=1` from the URL so refreshes stay calm. */
export function OrderPlacedBanner({ orderId, show }: { orderId: string; show: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => {
      router.replace(`/orders/${orderId}`);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [show, orderId, router]);

  if (!show) return null;

  return (
    <div className="alert-success mb-4 p-4 sm:p-5" role="status">
      <p className="section-kicker text-success">Order placed</p>
      <p className="mt-2 text-sm text-emerald-800/90">
        We received your order. You can download the invoice PDF below.{" "}
        <Link href="/orders" className="font-medium underline underline-offset-2">
          All orders
        </Link>
      </p>
    </div>
  );
}
