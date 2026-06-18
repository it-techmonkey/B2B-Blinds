import type { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const updated = await prisma.user.updateMany({
      where: { id, role: UserRole.CUSTOMER },
      data: { status: UserStatus.REJECTED, approved: false },
    });
    if (updated.count === 0) {
      return jsonError("Customer not found", 404);
    }
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, status: true },
    });
    return jsonOk({ user });
  } catch (e) {
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
