import { NextRequest } from "next/server";
import { loginSchema } from "@/server/validation/schemas";
import { loginUser } from "@/server/services/auth.service";
import { jsonError, jsonOk } from "@/lib/http";
import { COOKIE_NAME } from "@/lib/auth/jwt";
import { AppError, UnauthorizedError } from "@/server/errors";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const { token, user } = await loginUser(email, password);
    const res = jsonOk({ user });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    if (e instanceof ZodError) {
      return jsonError("Validation failed", 400, e.flatten());
    }
    if (e instanceof UnauthorizedError) {
      return jsonError(e.message, e.statusCode);
    }
    if (e instanceof AppError) {
      return jsonError(e.message, e.statusCode);
    }
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
