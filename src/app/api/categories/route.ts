import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/http";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    return jsonOk({ data: categories });
  } catch (e) {
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
