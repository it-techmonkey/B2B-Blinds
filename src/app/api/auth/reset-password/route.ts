import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { hashPassword } from "@/lib/auth/password";
import { COOKIE_NAME } from "@/lib/auth/jwt";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: { id: true, passwordResetTokenExpiry: true },
    });

    if (!user || !user.passwordResetTokenExpiry || user.passwordResetTokenExpiry < new Date()) {
      return jsonError("This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetTokenExpiry: null },
    });

    // Drop any session cookie in this browser so the user signs in fresh with the new password.
    const res = jsonOk({ message: "Password updated successfully." });
    res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid request", 400);
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
