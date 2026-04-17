import { NextRequest } from "next/server";
import { paginationSchema } from "@/server/validation/schemas";
import { listMyOrders } from "@/server/services/order.service";
import { requireCustomer } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { serializeOrderRow } from "@/server/serialize";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCustomer(request);
    const { searchParams } = new URL(request.url);
    const q = Object.fromEntries(searchParams.entries());
    const { page, limit } = paginationSchema.parse(q);
    const result = await listMyOrders(user.sub, page, limit);
    return jsonOk({
      data: result.data.map(serializeOrderRow),
      pagination: result.pagination,
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
