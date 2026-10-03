import { NextRequest } from "next/server";
import { requireCustomer } from "@/lib/auth/api";
import { jsonOk } from "@/lib/http";
import { handleApiError } from "@/lib/api-errors";
import { deleteSavedOrder, getSavedOrder } from "@/server/services/saved-order.service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  try {
    const session = await requireCustomer(request);
    const { id } = await params;
    return jsonOk({ data: await getSavedOrder(session.sub, id) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  try {
    const session = await requireCustomer(request);
    const { id } = await params;
    await deleteSavedOrder(session.sub, id);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
