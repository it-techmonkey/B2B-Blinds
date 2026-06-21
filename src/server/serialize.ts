import type { Order, OrderItem, Prisma } from "@prisma/client";

/** Stable string for Prisma.Decimal in UI and PDFs */
export function formatDecimal(d: Prisma.Decimal): string {
  return d.toFixed(2);
}

/** List/dashboard row without line items (lighter DB payload). */
export function serializeOrderRow(o: Order) {
  return {
    id: o.id,
    referenceNumber: o.referenceNumber,
    userId: o.userId,
    customerName: o.customerName,
    customerBusinessName: o.customerBusinessName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    customerCity: o.customerCity,
    status: o.status,
    totalAmount: formatDecimal(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

type OrderWithRelations = Order & {
  items: (OrderItem & {
    variant?: { id: string; size: string; stock: number } | null;
  })[];
  user?: { id: string; name: string; email: string } | null;
};

function dec(d: Prisma.Decimal): string {
  return formatDecimal(d);
}

export function serializeOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    referenceNumber: o.referenceNumber,
    userId: o.userId,
    customerName: o.customerName,
    customerBusinessName: o.customerBusinessName,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    customerCity: o.customerCity,
    customerNotes: o.customerNotes,
    status: o.status,
    totalAmount: dec(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    user: o.user ?? undefined,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      productName: i.productName,
      size: i.sizeSnapshot,
      price: dec(i.price),
      quantity: i.quantity,
      total: dec(i.total),
      stockOnHand: i.variant?.stock ?? null,
    })),
  };
}
