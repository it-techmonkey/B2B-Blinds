import type { NextRequest } from "next/server";
import { adminCreateOrderSchema } from "@/server/validation/schemas";
import { createOrder } from "@/server/services/order.service";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { serializeOrder } from "@/server/serialize";
import { signInvoiceAccessToken } from "@/lib/invoice-access";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const { userId, items, customer } = adminCreateOrderSchema.parse(body);
    const order = await createOrder(items, customer, userId);
    const invoiceAccessToken = await signInvoiceAccessToken(order.id);
    return jsonOk({ order: serializeOrder(order), invoiceAccessToken }, 201);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
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
