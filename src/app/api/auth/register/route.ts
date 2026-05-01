import { NextRequest } from "next/server";
import { registerSchema } from "@/server/validation/schemas";
import { registerCustomer } from "@/server/services/auth.service";
import { jsonError, jsonOk } from "@/lib/http";
import { COOKIE_NAME } from "@/lib/auth/jwt";
import { AppError, ForbiddenError } from "@/server/errors";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = registerSchema.parse(body);
    const { token, user, pendingApproval } = await registerCustomer(name, email, password);
    const res = jsonOk({ user, pendingApproval: pendingApproval ?? false }, 201);
    if (token) {
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res;
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof ForbiddenError || e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
