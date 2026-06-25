import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to avoid leaking whether an email exists
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetTokenExpiry: expiry },
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? request.nextUrl.origin;
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailErr) {
        console.error("[forgot-password] email send failed:", emailErr);
      }
    }

    return jsonOk({ message: "If that email exists, a reset link has been sent." });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid email", 400);
    console.error("[forgot-password]", e);
    return jsonError("Internal server error", 500);
  }
}
