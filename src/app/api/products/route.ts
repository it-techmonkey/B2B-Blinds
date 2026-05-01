import { NextRequest } from "next/server";
import { paginationSchema, productCreateBaseSchema, resolveProductCreateVariants } from "@/server/validation/schemas";
import {
  listProductsAdmin,
  listProductsPublic,
  createProduct,
  serializeProductListRow,
} from "@/server/services/product.service";
import { requireAdmin, requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = Object.fromEntries(searchParams.entries());
    const { page, limit } = paginationSchema.parse(q);
    const categoryRaw = typeof q.category === "string" ? q.category.trim() : "";
    const categoryName = categoryRaw.length > 0 ? categoryRaw : undefined;

    const auth = await requireAuth(request).catch(() => null);
    if (auth?.role === "ADMIN") {
      const result = categoryName
        ? await listProductsPublic(page, limit, categoryName)
        : await listProductsAdmin(page, limit);
      return jsonOk(result);
    }
    const result = await listProductsPublic(page, limit, categoryName);
    return jsonOk(result);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    const conn = connectionErrorResponse(e);
    if (conn) {
      console.error(e);
      return jsonError(conn.message, conn.status);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const data = productCreateBaseSchema.parse(body);
    const variants = resolveProductCreateVariants(data);
    if (variants.length === 0) {
      return jsonError("Provide variants array, or price+stock for simple product", 400);
    }
    const product = await createProduct({
      name: data.name,
      categoryId: data.categoryId,
      hasVariants: data.hasVariants,
      isActive: data.isActive ?? true,
      variants,
    });
    return jsonOk({ product: serializeProductListRow(product) }, 201);
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    const conn = connectionErrorResponse(e);
    if (conn) {
      console.error(e);
      return jsonError(conn.message, conn.status);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
