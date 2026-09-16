import type { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";
import { sendAccountApprovedEmail } from "@/lib/email";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;

    let body: { discount?: number | null; overrides?: { variantId: string; price: number }[]; blockedProductIds?: string[] } = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine
    }

    const updated = await prisma.user.updateMany({
      where: { id, role: UserRole.CUSTOMER },
      data: {
        status: UserStatus.APPROVED,
        approved: true,
        pricingDiscount:
          body.discount != null && body.discount > 0
            ? new Prisma.Decimal(body.discount)
            : null,
      },
    });
    if (updated.count === 0) {
      return jsonError("Customer not found", 404);
    }

    if (body.overrides && body.overrides.length > 0) {
      await prisma.clientPriceOverride.deleteMany({ where: { userId: id } });
      await prisma.clientPriceOverride.createMany({
        data: body.overrides.map((o) => ({
          userId: id,
          variantId: o.variantId,
          price: new Prisma.Decimal(o.price),
        })),
      });
    }

    if (body.blockedProductIds && body.blockedProductIds.length > 0) {
      await prisma.clientProductBlock.deleteMany({ where: { userId: id } });
      await prisma.clientProductBlock.createMany({
        data: body.blockedProductIds.map((productId) => ({ userId: id, productId })),
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, status: true, approved: true, pricingDiscount: true },
    });

    if (user) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin;
      sendAccountApprovedEmail(user.email, user.name, `${baseUrl}/login`).catch((err) =>
        console.error("[approve] Failed to send account approved email:", err)
      );
    }

    return jsonOk({ user });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    const conn = connectionErrorResponse(e);
    if (conn) {
      console.error(e);
      return jsonError(conn.message, conn.status);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
