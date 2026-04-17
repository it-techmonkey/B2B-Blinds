import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@prisma/client";

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

const COOKIE_NAME = "auth_token";

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: JwtPayload, expiresIn = "7d"): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  const sub = payload.sub;
  const email = payload.email;
  const role = payload.role;
  if (typeof sub !== "string" || typeof email !== "string" || (role !== "ADMIN" && role !== "CUSTOMER")) {
    throw new Error("Invalid token payload");
  }
  return { sub, email, role };
}

export { COOKIE_NAME };
