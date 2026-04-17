import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME, type JwtPayload } from "@/lib/auth/jwt";

export async function getSession(): Promise<JwtPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
