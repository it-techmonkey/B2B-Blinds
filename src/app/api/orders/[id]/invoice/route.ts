import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/server/services/order.service";
import { buildInvoicePdf, type OrderForInvoice } from "@/server/services/invoice.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError } from "@/lib/http";
import { AppError, UnauthorizedError } from "@/server/errors";
import { verifyInvoiceAccessToken } from "@/lib/invoice-access";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const { id } = await context.params;
    const invoiceAccessToken = new URL(request.url).searchParams.get("token");

    let order: OrderForInvoice;
    try {
      const user = await requireAuth(request);
      order = await getOrderById(id, user.sub, user.role === "ADMIN");
    } catch (authError) {
      if (!(authError instanceof UnauthorizedError) || !invoiceAccessToken) {
        throw authError;
      }
      const access = await verifyInvoiceAccessToken(invoiceAccessToken);
      if (access.orderId !== id) {
        throw new UnauthorizedError();
      }
      const guestOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      if (!guestOrder) {
        return jsonError("Order not found", 404);
      }
      order = guestOrder;
    }

    const buffer = await buildInvoicePdf(order);
    const filename = `invoice-${order.id.slice(0, 8)}.pdf`;
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error("[invoice]", e);
    return jsonError("Internal server error", 500);
  }
}
