import { NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { UserRole } from "@prisma/client";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };
const updateClientSchema = z.object({
  name: z.string().trim().min(1).max(200), businessName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(), city: z.string().trim().max(120).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(), invoiceAddress: z.string().trim().max(8_000).optional().nullable(), deliveryAddress: z.string().trim().max(8_000).optional().nullable(),
  allowCreditWithoutPurchase: z.coerce.boolean().optional(),
});

export async function PUT(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const data = updateClientSchema.parse(await request.json());
    const user = await prisma.user.updateMany({ where: { id, role: UserRole.CUSTOMER }, data });
    if (!user.count) return jsonError("Client not found", 404);
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) return jsonError("Validation failed", 400, error.flatten());
    console.error(error);
    return jsonError("Internal server error", 500);
  }
}
