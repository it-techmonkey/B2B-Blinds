import { NextRequest } from "next/server";
import { orderStatusSchema } from "@/server/validation/schemas";
import { updateOrderStatus } from "@/server/services/order.service";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { serializeOrder } from "@/server/serialize";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const { status } = orderStatusSchema.parse(body);
    const order = await updateOrderStatus(id, status);
    return jsonOk({ order: serializeOrder(order) });
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
