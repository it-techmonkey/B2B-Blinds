import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/server/errors";

export type SavedItemInput = { productId: string; variantId?: string; quantity: number };
export type SavedCustomerInput = {
  name?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  city?: string;
  notes?: string;
  customerReference?: string;
};

type StoredItem = { productId: string; variantId: string; quantity: number; price: string };

export type SavedOrderLine = {
  productId: string;
  variantId: string;
  quantity: number;
  productName: string;
  size: string;
  /** Current price for this client */
  price: string;
};

/** Prices the items at the client's current pricing. Items no longer orderable are dropped and counted. */
export async function priceItems(userId: string, items: { productId: string; variantId?: string; quantity: number }[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.productId))] }, isActive: true },
    include: { variants: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));
  const client = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pricingDiscount: true,
      priceOverrides: { select: { variantId: true, price: true } },
      productBlocks: { select: { productId: true } },
    },
  });
  const overrides = new Map((client?.priceOverrides ?? []).map((o) => [o.variantId, o.price]));
  const blocked = new Set((client?.productBlocks ?? []).map((b) => b.productId));
  const discount = client?.pricingDiscount ?? null;

  function clientPrice(list: Prisma.Decimal, variantId: string): string {
    const override = overrides.get(variantId);
    if (override) return override.toFixed(2);
    if (discount && discount.gt(0)) {
      return list.mul(new Prisma.Decimal(1).sub(discount.div(100))).toDecimalPlaces(2).toFixed(2);
    }
    return list.toFixed(2);
  }

  const lines: SavedOrderLine[] = [];
  let unavailable = 0;
  for (const item of items) {
    const product = productById.get(item.productId);
    const variant = product
      ? item.variantId
        ? product.variants.find((v) => v.id === item.variantId)
        : product.variants.length === 1
          ? product.variants[0]
          : undefined
      : undefined;
    if (!product || !variant || blocked.has(product.id)) {
      unavailable += 1;
      continue;
    }
    lines.push({
      productId: product.id,
      variantId: variant.id,
      quantity: item.quantity,
      productName: product.name,
      size: variant.size ?? "",
      price: clientPrice(variant.price, variant.id),
    });
  }
  return { lines, unavailable };
}

function sumLines(lines: { price: string; quantity: number }[]): string {
  return lines.reduce((t, l) => t.add(new Prisma.Decimal(l.price).mul(l.quantity)), new Prisma.Decimal(0)).toFixed(2);
}

export async function createSavedOrder(userId: string, items: SavedItemInput[], customer: SavedCustomerInput) {
  const { lines } = await priceItems(userId, items);
  if (lines.length === 0) throw new NotFoundError("None of these products are available to order");
  const stored: StoredItem[] = lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    quantity: l.quantity,
    price: l.price,
  }));
  const row = await prisma.savedOrder.create({
    data: { userId, items: stored, customer },
  });
  return { id: row.id };
}

async function toView(userId: string, row: { id: string; items: unknown; customer: unknown; createdAt: Date; updatedAt: Date }) {
  const stored = row.items as StoredItem[];
  const { lines, unavailable } = await priceItems(userId, stored);
  const savedPrice = new Map(stored.map((s) => [s.variantId, s.price]));
  const savedTotal = sumLines(stored);
  const currentTotal = sumLines(lines);
  const priceChanged = lines.some((l) => savedPrice.get(l.variantId) !== l.price);
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    customer: row.customer as SavedCustomerInput,
    lines,
    unavailable,
    currentTotal,
    savedTotal,
    priceChanged,
  };
}

export async function listSavedOrders(userId: string) {
  const rows = await prisma.savedOrder.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  return Promise.all(rows.map((r) => toView(userId, r)));
}

export async function getSavedOrder(userId: string, id: string) {
  const row = await prisma.savedOrder.findFirst({ where: { id, userId } });
  if (!row) throw new NotFoundError("Saved order not found");
  return toView(userId, row);
}

/** Only saved orders can be deleted; placed orders and invoices never are. */
export async function deleteSavedOrder(userId: string, id: string) {
  const res = await prisma.savedOrder.deleteMany({ where: { id, userId } });
  if (res.count === 0) throw new NotFoundError("Saved order not found");
}
