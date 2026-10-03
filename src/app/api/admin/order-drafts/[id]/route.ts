import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/api";
import { jsonOk } from "@/lib/http";
import { handleApiError } from "@/lib/api-errors";
import { deleteAdminDraft } from "@/server/services/admin-order-draft.service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    await deleteAdminDraft(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
