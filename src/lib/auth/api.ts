import type { NextRequest } from "next/server";
import { verifyToken, COOKIE_NAME, type JwtPayload } from "@/lib/auth/jwt";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";

export async function requireAuth(request: NextRequest): Promise<JwtPayload> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new UnauthorizedError();
  try {
    return await verifyToken(token);
  } catch {
    throw new UnauthorizedError("Invalid or expired session");
  }
}

export async function requireAdmin(request: NextRequest): Promise<JwtPayload> {
  const user = await requireAuth(request);
  if (user.role !== "ADMIN") throw new ForbiddenError();
  return user;
}

export async function requireCustomer(request: NextRequest): Promise<JwtPayload> {
  const user = await requireAuth(request);
  if (user.role !== "CUSTOMER") throw new ForbiddenError("Customer access only");
  return user;
}
