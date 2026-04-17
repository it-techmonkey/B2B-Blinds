import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);
  const url = process.env.DATABASE_URL ?? "";

  if (url.includes("neon.tech")) {
    neonConfig.webSocketConstructor = ws;
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
