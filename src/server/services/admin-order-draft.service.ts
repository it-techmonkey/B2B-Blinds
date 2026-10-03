import { prisma } from "@/lib/db";
import { NotFoundError } from "@/server/errors";
import { priceItems, type SavedCustomerInput } from "@/server/services/saved-order.service";

export type DraftItemInput = { productId: string; variantId: string; quantity: number; price?: number };
type StoredDraftItem = DraftItemInput & { refPrice?: string };

export async function saveAdminDraft(input: {
  id?: string;
  clientId: string;
  items: DraftItemInput[];
  customer: SavedCustomerInput;
}) {
  const client = await prisma.user.findFirst({ where: { id: input.clientId, role: "CUSTOMER" }, select: { id: true } });
  if (!client) throw new NotFoundError("Client not found");

  // Remember the client's standard price now, so we can flag if it has changed when the draft is reopened
  const { lines } = await priceItems(input.clientId, input.items);
  const refByVariant = new Map(lines.map((l) => [l.variantId, l.price]));
  const items: StoredDraftItem[] = input.items.map((i) => ({ ...i, refPrice: refByVariant.get(i.variantId) }));

  if (input.id) {
    const res = await prisma.adminOrderDraft.updateMany({
      where: { id: input.id },
      data: { clientId: input.clientId, items, customer: input.customer },
    });
    if (res.count === 0) throw new NotFoundError("Draft not found");
    return { id: input.id };
  }
  const row = await prisma.adminOrderDraft.create({
    data: { clientId: input.clientId, items, customer: input.customer },
  });
  return { id: row.id };
}

export async function listAdminDrafts() {
  const rows = await prisma.adminOrderDraft.findMany({
    orderBy: { updatedAt: "desc" },
    include: { client: { select: { name: true, businessName: true } } },
  });
  return Promise.all(
    rows.map(async (r) => {
      const stored = r.items as StoredDraftItem[];
      const { lines } = await priceItems(r.clientId, stored);
      const current = new Map(lines.map((l) => [l.variantId, l.price]));
      return {
        id: r.id,
        clientId: r.clientId,
        clientName: r.client.businessName || r.client.name,
        updatedAt: r.updatedAt.toISOString(),
        customer: r.customer as SavedCustomerInput,
        items: stored.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          price: i.price,
          // The client's standard price has changed since this draft was saved
          standardPriceChanged: i.refPrice !== undefined && current.has(i.variantId) && current.get(i.variantId) !== i.refPrice,
          standardPrice: current.get(i.variantId) ?? null,
        })),
      };
    })
  );
}

export async function deleteAdminDraft(id: string) {
  const res = await prisma.adminOrderDraft.deleteMany({ where: { id } });
  if (res.count === 0) throw new NotFoundError("Draft not found");
}
