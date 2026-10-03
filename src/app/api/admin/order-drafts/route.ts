import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/api";
import { jsonOk } from "@/lib/http";
import { handleApiError } from "@/lib/api-errors";
import { adminOrderDraftSchema } from "@/server/validation/schemas";
import { listAdminDrafts, saveAdminDraft } from "@/server/services/admin-order-draft.service";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return jsonOk({ data: await listAdminDrafts() });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Creates a draft, or updates it when `id` is given. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = adminOrderDraftSchema.parse(await request.json());
    return jsonOk(await saveAdminDraft(body), 201);
  } catch (e) {
    return handleApiError(e);
  }
}
