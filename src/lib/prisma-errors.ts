import { Prisma } from "@prisma/client";

/** User-facing hint when Prisma cannot connect (Neon, local Postgres, etc.). */
export function connectionErrorResponse(error: unknown): { message: string; status: number } | null {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 503,
      message:
        "Database unreachable. If you use Neon: open the Neon dashboard to wake the project, confirm DATABASE_URL, and use sslmode=require (see .env.example).",
    };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P1001") {
      return {
        status: 503,
        message:
          "Cannot reach database (P1001). Check Neon is running, DATABASE_URL host/port, and that outbound TCP to port 5432 is allowed.",
      };
    }
  }
  return null;
}
