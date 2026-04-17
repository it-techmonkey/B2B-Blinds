import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/api";
import { jsonError, jsonOk } from "@/lib/http";
import { AppError } from "@/server/errors";

export async function GET(request: NextRequest) {
  try {
    const payload = await requireAuth(request);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      return jsonError("User not found", 404);
    }
    return jsonOk({ user });
  } catch (e) {
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
