import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/api";
import { jsonOk } from "@/lib/http";
import { handleApiError } from "@/lib/api-errors";
import { saveOrderSchema } from "@/server/validation/schemas";
import { createSavedOrder, listSavedOrders } from "@/server/services/saved-order.service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireCustomer(request);
    return jsonOk({ data: await listSavedOrders(session.sub) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireCustomer(request);
    const { items, customer } = saveOrderSchema.parse(await request.json());
    return jsonOk(await createSavedOrder(session.sub, items, customer), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
