import { NextRequest } from "next/server";
import { productVariantWriteSchema } from "@/server/validation/schemas";
import { createVariant, serializeVariant } from "@/server/services/product.service";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id: productId } = await context.params;
    const body = await request.json();
    const data = productVariantWriteSchema.parse(body);
    const v = await createVariant(productId, {
      size: data.size,
      price: data.price,
      stock: data.stock,
      unit: data.unit,
    });
    return jsonOk({ variant: serializeVariant(v) }, 201);
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
