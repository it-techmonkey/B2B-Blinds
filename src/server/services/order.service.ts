import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, ForbiddenError, NotFoundError } from "@/server/errors";

async function generateReferenceNumber(): Promise<string> {
  const now = new Date();
  const datePart =
    String(now.getFullYear()) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const prefix = `ORD-${datePart}-`;

  // Count existing orders with this date prefix to determine sequence
  const count = await prisma.order.count({
    where: { referenceNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

export type OrderLineInput = { productId: string; variantId?: string; quantity: number };
export type OrderCustomerInput = {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  city: string;
  notes?: string;
};

export async function createOrder(items: OrderLineInput[], customer: OrderCustomerInput, userId?: string) {
  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { variants: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  // Load client pricing if authenticated
  let clientDiscount: Prisma.Decimal | null = null;
  const clientOverrideMap = new Map<string, Prisma.Decimal>(); // variantId → price
  if (userId) {
    const clientUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pricingDiscount: true,
        priceOverrides: { select: { variantId: true, price: true } },
      },
    });
    if (clientUser) {
      clientDiscount = clientUser.pricingDiscount;
      for (const o of clientUser.priceOverrides) {
        clientOverrideMap.set(o.variantId, o.price);
      }
    }
  }

  function resolvePrice(listPrice: Prisma.Decimal, variantId: string): Prisma.Decimal {
    const override = clientOverrideMap.get(variantId);
    if (override) return override;
    if (clientDiscount && clientDiscount.gt(0)) {
      const multiplier = new Prisma.Decimal(1).sub(clientDiscount.div(100));
      return listPrice.mul(multiplier).toDecimalPlaces(2);
    }
    return listPrice;
  }

  let totalAmount = new Prisma.Decimal(0);
  const lineCreates: {
    productId: string;
    variantId: string;
    productName: string;
    sizeSnapshot: string | null;
    price: Prisma.Decimal;
    quantity: number;
    total: Prisma.Decimal;
  }[] = [];
  const stockDecrements: { productId: string; variantId: string; quantity: number; label: string }[] = [];

  for (const line of items) {
    const product = productById.get(line.productId);
    if (!product) {
      throw new NotFoundError(`Product not found: ${line.productId}`);
    }

    let variant = line.variantId ? product.variants.find((v) => v.id === line.variantId) : undefined;

    if (!line.variantId && !product.hasVariants && product.variants.length === 1) {
      variant = product.variants[0];
    }

    if (!variant) {
      if (product.hasVariants) {
        throw new AppError(`Select a variant for "${product.name}"`, 400, "VARIANT_REQUIRED");
      }
      throw new NotFoundError(`Variant not found for product: ${line.productId}`);
    }

    if (variant.stock < line.quantity) {
      throw new AppError(`Insufficient stock for "${product.name}" (${variant.size})`, 409, "INSUFFICIENT_STOCK");
    }

    const effectivePrice = resolvePrice(variant.price, variant.id);
    const lineTotal = effectivePrice.mul(line.quantity);
    totalAmount = totalAmount.add(lineTotal);
    lineCreates.push({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      sizeSnapshot: variant.size,
      price: effectivePrice,
      quantity: line.quantity,
      total: lineTotal,
    });
    stockDecrements.push({
      productId: product.id,
      variantId: variant.id,
      quantity: line.quantity,
      label: `${product.name} (${variant.size})`,
    });
  }

  const referenceNumber = await generateReferenceNumber();

  // Neon serverless: long interactive transactions hit P2028. Keep tx to writes only.
  return prisma.$transaction(
    async (tx) => {
      for (const d of stockDecrements) {
        const updated = await tx.productVariant.updateMany({
          where: {
            id: d.variantId,
            productId: d.productId,
            stock: { gte: d.quantity },
          },
          data: { stock: { decrement: d.quantity } },
        });
        if (updated.count !== 1) {
          throw new AppError(`Insufficient stock for "${d.label}"`, 409, "INSUFFICIENT_STOCK");
        }
      }

      return tx.order.create({
        data: {
          referenceNumber,
          userId,
          status: "CREATED",
          totalAmount,
          customerName: customer.name,
          customerBusinessName: customer.businessName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerCity: customer.city,
          customerNotes: customer.notes?.trim() || null,
          items: {
            create: lineCreates.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.productName,
              sizeSnapshot: l.sizeSnapshot,
              price: l.price,
              quantity: l.quantity,
              total: l.total,
            })),
          },
        },
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
      });
    },
    { maxWait: 10_000, timeout: 15_000 }
  );
}

export async function getOrderById(orderId: string, requesterId: string, isAdmin: boolean) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: { select: { id: true, size: true, stock: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw new NotFoundError("Order not found");
  if (!isAdmin && order.userId !== requesterId) {
    throw new ForbiddenError();
  }
  return order;
}

export async function listMyOrders(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const where = { userId };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.count({ where }),
  ]);
  return {
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function listAllOrders(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.order.count(),
  ]);
  return {
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function updateOrderStatus(orderId: string, status: "CREATED" | "SHIPPED" | "DELIVERED") {
  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) throw new NotFoundError("Order not found");
  return prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      items: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
}
