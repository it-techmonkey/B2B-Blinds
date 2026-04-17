import { NextRequest } from "next/server";
import { productUpdateSchema } from "@/server/validation/schemas";
import { updateProduct, deleteProduct, getProductById, serializeProductListRow } from "@/server/services/product.service";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const product = await getProductById(id);
    return jsonOk({ product });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const data = productUpdateSchema.parse(body);
    const product = await updateProduct(id, {
      name: data.name,
      categoryId: data.categoryId,
      hasVariants: data.hasVariants,
      isActive: data.isActive,
    });
    return jsonOk({ product: serializeProductListRow(product) });
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
    const { id } = await context.params;
    await deleteProduct(id);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
