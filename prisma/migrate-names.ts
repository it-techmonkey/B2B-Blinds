/**
 * One-time migration: rename products to match new colour names agreed in the
 * 03/June/2026 meeting. Run with:
 *   npx tsx prisma/migrate-names.ts
 */
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const BLINDS_RENAMES: Array<[string, string]> = [
  ["50mm string Smooth White", "50mm string Cotton White"],
  ["50mm string Texture white", "50mm string Fiber White"],
  ["50mm string Niagara cream", "50mm string Light Marble"],
  ["50mm string grey wash",    "50mm string Soft Grey"],
  ["50mm string night fall",   "50mm string Iron Slate"],
];

const LADDER_TAPE_RENAMES: Array<[string, string]> = [
  ["25mm niagara cream tape", "25mm Light Marble tape"],
  ["38mm niagara cream tape", "38mm Light Marble tape"],
  ["25mm grey wash tape",     "25mm Soft Grey tape"],
  ["38mm grey wash tape",     "38mm Soft Grey tape"],
  ["25mm night fall tape",    "25mm Iron Slate tape"],
  ["38mm night fall tape",    "38mm Iron Slate tape"],
];

const BRACKETS_RENAMES: Array<[string, string]> = [
  ["50mm extension swatch", "Extension Face Fix Brackets"],
];

async function renameProducts(pairs: Array<[string, string]>, context: string) {
  for (const [oldName, newName] of pairs) {
    const product = await prisma.product.findFirst({ where: { name: oldName } });
    if (!product) {
      console.warn(`  [SKIP] "${oldName}" not found`);
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { name: newName } });
    console.log(`  [${context}] "${oldName}" → "${newName}"`);
  }
}

async function upsertProduct(categoryName: string, name: string, size: string, unit: "PIECE" | "METER") {
  const cat = await prisma.category.upsert({
    where: { name: categoryName },
    update: {},
    create: { name: categoryName },
  });
  const existing = await prisma.product.findFirst({ where: { name, categoryId: cat.id } });
  if (existing) {
    console.log(`  [SKIP] "${name}" already exists`);
    return;
  }
  await prisma.product.create({
    data: {
      name,
      categoryId: cat.id,
      hasVariants: false,
      isActive: true,
      variants: { create: [{ size, price: 0, stock: 0, unit }] },
    },
  });
  console.log(`  [${categoryName}] Added "${name}"`);
}

async function fixLadderTapes() {
  const cat = await prisma.category.upsert({
    where: { name: "Ladder Tapes" },
    update: {},
    create: { name: "Ladder Tapes" },
  });

  // Delete the incorrectly-created individual tape products
  const individualTapes = [
    "25mm White tape", "38mm White tape",
    "25mm Light Marble tape", "38mm Light Marble tape",
    "25mm Soft Grey tape", "38mm Soft Grey tape",
    "25mm Iron Slate tape", "38mm Iron Slate tape",
  ];
  for (const name of individualTapes) {
    const p = await prisma.product.findFirst({ where: { name, categoryId: cat.id } });
    if (p) {
      await prisma.productVariant.deleteMany({ where: { productId: p.id } });
      await prisma.product.delete({ where: { id: p.id } });
      console.log(`  [Ladder Tapes] Deleted individual product "${name}"`);
    }
  }

  // Create one product with 8 variants (colour × tape size)
  const existing = await prisma.product.findFirst({
    where: { name: "Ladder Tapes for 50mm Faux Wood", categoryId: cat.id },
  });
  if (existing) {
    console.log('  [SKIP] "Ladder Tapes for 50mm Faux Wood" already exists');
    return;
  }

  const variants = [
    { size: "White — 25mm tape",       price: 0, stock: 0, unit: "PIECE" as const },
    { size: "White — 38mm tape",       price: 0, stock: 0, unit: "PIECE" as const },
    { size: "Light Marble — 25mm tape", price: 0, stock: 0, unit: "PIECE" as const },
    { size: "Light Marble — 38mm tape", price: 0, stock: 0, unit: "PIECE" as const },
    { size: "Soft Grey — 25mm tape",   price: 0, stock: 0, unit: "PIECE" as const },
    { size: "Soft Grey — 38mm tape",   price: 0, stock: 0, unit: "PIECE" as const },
    { size: "Iron Slate — 25mm tape",  price: 0, stock: 0, unit: "PIECE" as const },
    { size: "Iron Slate — 38mm tape",  price: 0, stock: 0, unit: "PIECE" as const },
  ];

  await prisma.product.create({
    data: {
      name: "Ladder Tapes for 50mm Faux Wood",
      categoryId: cat.id,
      hasVariants: true,
      isActive: true,
      variants: { create: variants },
    },
  });
  console.log('  [Ladder Tapes] Created "Ladder Tapes for 50mm Faux Wood" with 8 variants');
}

async function addMissingProducts() {
  // Brackets & Swatches
  await upsertProduct("Brackets & Swatches", "Extension Face Fix Brackets", "100 pcs/box", "PIECE");
  await upsertProduct("Brackets & Swatches", "Box Brackets", "100 pcs/box", "PIECE");
  await upsertProduct("Brackets & Swatches", "Sample Swatch", "Standard", "PIECE");

  // Tools & Machines
  await upsertProduct("Tools & Machines", "Inspection Hoist", "3m × 3m", "PIECE");
}

async function main() {
  console.log("=== Product name migration ===\n");

  console.log("Box Blinds (Blinds category):");
  await renameProducts(BLINDS_RENAMES, "Blinds");

  console.log("\nLadder Tapes:");
  await renameProducts(LADDER_TAPE_RENAMES, "Ladder Tapes");

  console.log("\nBrackets & Swatches:");
  await renameProducts(BRACKETS_RENAMES, "Brackets & Swatches");

  console.log("\nFix Ladder Tapes structure:");
  await fixLadderTapes();

  console.log("\nNew products:");
  await addMissingProducts();

  console.log("\n=== Done ===");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
