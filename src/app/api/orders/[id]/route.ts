import { NextRequest } from "next/server";
import { getOrderById } from "@/server/services/order.service";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { serializeOrder } from "@/server/serialize";
import { AppError } from "@/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const order = await getOrderById(id, user.sub, user.role === "ADMIN");
    return jsonOk({ order: serializeOrder(order) });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
