import { NextRequest } from "next/server";
import { productVariantPatchSchema } from "@/server/validation/schemas";
import { updateVariant, deleteVariant, serializeVariant } from "@/server/services/product.service";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string; variantId: string }> };

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id: productId, variantId } = await context.params;
    const body = await request.json();
    const data = productVariantPatchSchema.parse(body);
    const v = await updateVariant(productId, variantId, {
      size: data.size,
      price: data.price,
      stock: data.stock,
      unit: data.unit,
    });
    return jsonOk({ variant: serializeVariant(v) });
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

export async function DELETE(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id: productId, variantId } = await context.params;
    await deleteVariant(productId, variantId);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
