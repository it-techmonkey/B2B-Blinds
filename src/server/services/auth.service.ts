import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";

export async function loginUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

export async function registerCustomer(name: string, email: string, password: string) {
  const normalized = email.toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  if (adminEmail && normalized === adminEmail) {
    throw new ForbiddenError("This email is reserved for the administrator account");
  }
  const passwordHash = await hashPassword(password);
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email: normalized,
        passwordHash,
        role: UserRole.CUSTOMER,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { token, user };
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
    if (code === "P2002") {
      throw new ForbiddenError("Email already registered");
    }
    throw e;
  }
}
