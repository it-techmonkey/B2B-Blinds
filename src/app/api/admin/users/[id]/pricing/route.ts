import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const user = await prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER },
      select: {
        id: true,
        name: true,
        pricingDiscount: true,
        priceOverrides: {
          select: {
            variantId: true,
            price: true,
            variant: { select: { size: true, product: { select: { name: true } } } },
          },
        },
        productBlocks: { select: { productId: true } },
      },
    });
    if (!user) return jsonError("Customer not found", 404);
    return jsonOk({
      id: user.id,
      name: user.name,
      pricingDiscount: user.pricingDiscount?.toFixed(2) ?? null,
      overrides: user.priceOverrides.map((o) => ({
        variantId: o.variantId,
        price: o.price.toFixed(2),
        productName: o.variant.product.name,
        size: o.variant.size,
      })),
      blockedProductIds: user.productBlocks.map((b) => b.productId),
    });
  } catch (e) {
    if (e instanceof AppError) return jsonError(e.message, e.statusCode);
    const conn = connectionErrorResponse(e);
    if (conn) { console.error(e); return jsonError(conn.message, conn.status); }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body: {
      discount?: number | null;
      overrides?: { variantId: string; price: number }[];
      blockedProductIds?: string[];
    } = await request.json();

    const exists = await prisma.user.findFirst({ where: { id, role: UserRole.CUSTOMER } });
    if (!exists) return jsonError("Customer not found", 404);

    await prisma.user.update({
      where: { id },
      data: {
        pricingDiscount:
          body.discount != null && body.discount > 0
            ? new Prisma.Decimal(body.discount)
            : null,
      },
    });

    if (body.overrides !== undefined) {
      await prisma.clientPriceOverride.deleteMany({ where: { userId: id } });
      if (body.overrides.length > 0) {
        await prisma.clientPriceOverride.createMany({
          data: body.overrides.map((o) => ({
            userId: id,
            variantId: o.variantId,
            price: new Prisma.Decimal(o.price),
          })),
        });
      }
    }

    if (body.blockedProductIds !== undefined) {
      await prisma.clientProductBlock.deleteMany({ where: { userId: id } });
      if (body.blockedProductIds.length > 0) {
        await prisma.clientProductBlock.createMany({
          data: body.blockedProductIds.map((productId) => ({ userId: id, productId })),
        });
      }
    }

    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AppError) return jsonError(e.message, e.statusCode);
    const conn = connectionErrorResponse(e);
    if (conn) { console.error(e); return jsonError(conn.message, conn.status); }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
