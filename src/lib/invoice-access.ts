import { SignJWT, jwtVerify } from "jose";
import { getJwtSecretKey } from "@/lib/auth/jwt";

type InvoiceAccessPayload = {
  orderId: string;
  scope: "invoice_access";
};

export async function signInvoiceAccessToken(orderId: string, expiresIn = "24h"): Promise<string> {
  return new SignJWT({ orderId, scope: "invoice_access" } satisfies InvoiceAccessPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyInvoiceAccessToken(token: string): Promise<InvoiceAccessPayload> {
  const { payload } = await jwtVerify(token, getJwtSecretKey());
  const orderId = payload.orderId;
  const scope = payload.scope;
  if (typeof orderId !== "string" || scope !== "invoice_access") {
    throw new Error("Invalid invoice token payload");
  }
  return { orderId, scope };
}
