import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { issueOrderCreditNote } from "@/server/services/order.service";
import { creditNoteSchema } from "@/server/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const { reason } = creditNoteSchema.parse(await request.json());
    const creditNote = await issueOrderCreditNote(id, reason);
    return jsonOk({ creditNote }, 201);
  } catch (error) {
    if (error instanceof ZodError) return jsonError("Validation failed", 400, error.flatten());
    if (error instanceof AppError) return jsonError(error.message, error.statusCode);
    console.error(error);
    return jsonError("Internal server error", 500);
  }
}
