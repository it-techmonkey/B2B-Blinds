import { ZodError } from "zod";
import { jsonError } from "@/lib/http";
import { connectionErrorResponse } from "@/lib/prisma-errors";
import { AppError } from "@/server/errors";

export function handleApiError(e: unknown) {
  if (e instanceof ZodError) return jsonError("Validation failed", 400, e.flatten());
  if (e instanceof AppError) return jsonError(e.message, e.statusCode);
  const conn = connectionErrorResponse(e);
  if (conn) {
    console.error(e);
    return jsonError(conn.message, conn.status);
  }
  console.error(e);
  return jsonError("Internal server error", 500);
}
