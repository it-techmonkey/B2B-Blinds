import { prisma } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/http";
import { compareCategoryNames } from "@/lib/category-order";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
    categories.sort((a, b) => compareCategoryNames(a.name, b.name));
    return jsonOk({ data: categories });
  } catch (e) {
    console.error(e);
    return jsonError("Internal server error", 500);
  }
}
