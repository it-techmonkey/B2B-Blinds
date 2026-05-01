import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const users = await prisma.user.findMany({
      where: { role: UserRole.CUSTOMER },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        approved: true,
        businessName: true,
        phone: true,
        invoiceAddress: true,
        deliveryAddress: true,
        createdAt: true,
        orders: { select: { totalAmount: true } },
      },
    });
    const data = users.map((u) => {
      const totalSpent = u.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        approved: u.approved,
        businessName: u.businessName,
        phone: u.phone,
        invoiceAddress: u.invoiceAddress,
        deliveryAddress: u.deliveryAddress,
        createdAt: u.createdAt.toISOString(),
        orderCount: u.orders.length,
        totalSpent: totalSpent.toFixed(2),
      };
    });
    return jsonOk({ data });
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
