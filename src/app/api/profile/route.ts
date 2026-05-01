import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/api";
import { profilePatchSchema } from "@/server/validation/schemas";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";
import { ZodError } from "zod";

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireCustomer(request);
    const body = await request.json();
    const data = profilePatchSchema.parse(body);

    const patch: {
      businessName?: string | null;
      phone?: string | null;
      invoiceAddress?: string | null;
      deliveryAddress?: string | null;
    } = {};
    if (data.businessName !== undefined) patch.businessName = data.businessName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.invoiceAddress !== undefined) patch.invoiceAddress = data.invoiceAddress;
    if (data.deliveryAddress !== undefined) patch.deliveryAddress = data.deliveryAddress;

    const user = await prisma.user.update({
      where: { id: session.sub },
      data: patch,
      select: {
        id: true,
        name: true,
        email: true,
        businessName: true,
        phone: true,
        invoiceAddress: true,
        deliveryAddress: true,
      },
    });
    return jsonOk({ user });
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
