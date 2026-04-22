import { NextRequest } from "next/server";
import { createOrderSchema, paginationSchema } from "@/server/validation/schemas";
import { createOrder, listAllOrders } from "@/server/services/order.service";
import { requireAdmin, requireCustomer } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { serializeOrder } from "@/server/serialize";
import { AppError } from "@/server/errors";
import { signInvoiceAccessToken } from "@/lib/invoice-access";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = Object.fromEntries(searchParams.entries());
    const { page, limit } = paginationSchema.parse(q);
    const result = await listAllOrders(page, limit);
    return jsonOk({
      data: result.data.map(serializeOrder),
      pagination: result.pagination,
    });
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

export async function POST(request: NextRequest) {
  try {
    const session = await requireCustomer(request);
    const body = await request.json();
    const { items, customer } = createOrderSchema.parse(body);
    const order = await createOrder(items, customer, session.sub);
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
