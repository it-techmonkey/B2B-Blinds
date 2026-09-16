import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { issueProductCreditNote, listProductCreditNotes } from "@/server/services/order.service";
import { productCreditNoteSchema } from "@/server/validation/schemas";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const creditNotes = await listProductCreditNotes(id);
    return jsonOk({ creditNotes });
  } catch (error) {
    if (error instanceof AppError) return jsonError(error.message, error.statusCode);
    console.error(error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const data = productCreditNoteSchema.parse(await request.json());
    const creditNote = await issueProductCreditNote(id, data);
    return jsonOk({ creditNote }, 201);
  } catch (error) {
    if (error instanceof ZodError) return jsonError("Validation failed", 400, error.flatten());
    if (error instanceof AppError) return jsonError(error.message, error.statusCode);
    console.error(error);
    return jsonError("Internal server error", 500);
  }
}
