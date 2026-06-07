import { loadEnvConfig } from "@next/env";
import { PrismaClient, UserRole, VariantUnit } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import { createRequire } from "module";
import * as path from "path";
import { fileURLToPath } from "url";

// Match Next.js so seed uses the same DATABASE_URL / ADMIN_* as `next dev` (.env.local overrides .env).
loadEnvConfig(process.cwd());

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx") as {
  readFile: (p: string) => import("xlsx").WorkBook;
  utils: { sheet_to_json: <T>(sheet: unknown, opts?: { defval?: string }) => T[] };
};

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Stock for every variant row imported from the blinds price list */
const IMPORT_STOCK = 10;

function parseBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

function parseUnit(v: unknown): VariantUnit {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "meter" || s === "m" || s === "mtr") return VariantUnit.METER;
  return VariantUnit.PIECE;
}

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/_/g, "");
}

function titleCaseCategory(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function resolveProductsXlsxPath(): string | null {
  for (const name of ["Products.xlsx", "products.xlsx"]) {
    const p = path.join(__dirname, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Box blinds–style sheet: product name | size (2nd col) | unit cost | unit of sale */
function seedFromBlindsPriceList(rows: Record<string, unknown>[]) {
  const headerMap: Record<string, string> = {};
  if (rows[0]) {
    for (const key of Object.keys(rows[0])) {
      headerMap[normKey(key)] = key;
    }
  }

  const kProd = headerMap["productname"] ?? headerMap["product"];
  const kPrice =
    headerMap["unitcost"] ?? headerMap["unitprice"] ?? headerMap["price"] ?? headerMap["listprice"];
  const kSize = headerMap["empty"] ?? headerMap["size"] ?? headerMap["dimensions"];
  const kUnit = headerMap["unitofsale"] ?? headerMap["unit"] ?? headerMap["uom"];

  if (!kProd || !kPrice || !kSize) {
    return false;
  }

  type Group = {
    category: string;
    product: string;
    lines: { size: string; price: number; stock: number; unit: VariantUnit }[];
  };

  let sheetCategory = "Blinds";
  const groups = new Map<string, Group>();

  for (const row of rows) {
    const rawPrice = row[kPrice];
    const price =
      typeof rawPrice === "number" ? rawPrice : Number(String(rawPrice).replace(/[^0-9.-]/g, ""));
    const pn = String(row[kProd] ?? "").trim();
    const sizeRaw = String(row[kSize] ?? "").trim();
    const unit = kUnit ? parseUnit(row[kUnit]) : VariantUnit.PIECE;

    if (!Number.isFinite(price) || price <= 0) {
      if (pn && !sizeRaw) {
        sheetCategory = titleCaseCategory(pn);
      }
      continue;
    }

    if (!pn || !sizeRaw) continue;

    const key = `${sheetCategory}|||${pn}`;
    let g = groups.get(key);
    if (!g) {
      g = { category: sheetCategory, product: pn, lines: [] };
      groups.set(key, g);
    }
    g.lines.push({ size: sizeRaw, price, stock: IMPORT_STOCK, unit });
  }

  return groups;
}

async function seedFromProductsXlsx(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.log("No prisma/Products.xlsx or products.xlsx — skip product import.");
    return;
  }

  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length === 0) {
    console.log("Excel empty — skip.");
    return;
  }

  const headerMap: Record<string, string> = {};
  for (const key of Object.keys(rows[0])) {
    headerMap[normKey(key)] = key;
  }

  function col(...names: string[]): string | undefined {
    for (const n of names) {
      const k = headerMap[normKey(n)];
      if (k) return k;
    }
    return undefined;
  }

  const kCat = col("category", "categoryname");
  const kProd = col("productname", "product", "name");
  const kHasVar = col("hasvariants", "variants", "has_variants");
  const kSize = col("size", "sizes", "dimension");
  const kPrice = col("price", "unitprice", "unitcost");
  const kStock = col("stock", "qty", "quantity");
  const kUnit = col("unit", "uom", "unitofsale");

  type Group = {
    category: string;
    product: string;
    hasVariants: boolean;
    lines: { size: string; price: number; stock: number; unit: VariantUnit }[];
  };

  let groups: Map<string, Group> | false = false;

  if (kCat && kProd && kPrice) {
    groups = new Map();
    for (const row of rows) {
      const category = String(row[kCat] ?? "").trim();
      const product = String(row[kProd] ?? "").trim();
      if (!category || !product) continue;

      const price = Number(row[kPrice]);
      if (Number.isNaN(price)) continue;
      const stock = kStock ? Number(row[kStock]) : IMPORT_STOCK;
      const stockFinal = Number.isFinite(stock) && stock >= 0 ? stock : IMPORT_STOCK;

      const sizeRaw = kSize ? String(row[kSize] ?? "").trim() : "";
      const size = sizeRaw || "Standard";
      const unit = kUnit ? parseUnit(row[kUnit]) : VariantUnit.PIECE;
      const hasFlag = kHasVar ? parseBool(row[kHasVar]) : false;

      const key = `${category}|||${product}`;
      let g = groups.get(key);
      if (!g) {
        g = { category, product, hasVariants: hasFlag, lines: [] };
        groups.set(key, g);
      }
      g.lines.push({ size, price, stock: stockFinal, unit });
      if (hasFlag) g.hasVariants = true;
    }
  } else {
    const blinds = seedFromBlindsPriceList(rows);
    if (!blinds || blinds.size === 0) {
      console.error(
        "Excel: unrecognized format. Use Category + ProductName + Price + Stock columns, or the blinds list (product name, size column, unit cost, unit of sale)."
      );
      return;
    }
    groups = new Map();
    for (const [key, g0] of blinds) {
      const hasVariants = g0.lines.length >= 2;
      const lines = hasVariants ? g0.lines : [g0.lines[0]];
      groups.set(key, {
        category: g0.category,
        product: g0.product,
        hasVariants,
        lines,
      });
    }
  }

  for (const g of groups.values()) {
    if (g.lines.length >= 2) g.hasVariants = true;
    if (!g.hasVariants) {
      g.lines = [g.lines[0]];
    }
    if (g.hasVariants && g.lines.length < 2) {
      console.warn(`Skip "${g.product}": needs ≥2 variant rows`);
      continue;
    }

    for (const line of g.lines) {
      line.stock = IMPORT_STOCK;
    }

    const cat = await prisma.category.upsert({
      where: { name: g.category },
      update: {},
      create: { name: g.category },
    });

    const existing = await prisma.product.findFirst({
      where: { name: g.product, categoryId: cat.id },
      include: { variants: true },
    });

    if (existing) {
      await prisma.productVariant.updateMany({
        where: { productId: existing.id },
        data: { stock: IMPORT_STOCK },
      });
      console.log(`Updated stock to ${IMPORT_STOCK} for all variants: ${g.product}`);
      continue;
    }

    await prisma.product.create({
      data: {
        name: g.product,
        categoryId: cat.id,
        hasVariants: g.hasVariants,
        isActive: true,
        variants: {
          create: g.lines.map((l) => ({
            size: l.size,
            price: l.price,
            stock: l.stock,
            unit: l.unit,
          })),
        },
      },
    });
    console.log(`Imported product: ${g.product} (${g.lines.length} variant(s), stock ${IMPORT_STOCK} each)`);
  }
}

/** Box Blinds catalog: fabric colours with size variants */
async function seedBoxBlindsCatalog() {
  const cat = await prisma.category.upsert({
    where: { name: "Box Blinds" },
    update: {},
    create: { name: "Box Blinds" },
  });

  const mmSizes = [
    { size: "45mm",  price: 52 },
    { size: "57mm",  price: 58 },
    { size: "61mm",  price: 64 },
    { size: "107mm", price: 89 },
  ];

  const fabricLines = [
    "Cotton White",
    "Fiber White",
    "String Soft Grey",
    "Light Marble",
    "String Iron Slate",
  ];

  for (const name of fabricLines) {
    const existing = await prisma.product.findFirst({ where: { name, categoryId: cat.id } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        name,
        categoryId: cat.id,
        hasVariants: true,
        isActive: true,
        variants: {
          create: mmSizes.map((l) => ({
            size: l.size,
            price: l.price,
            stock: IMPORT_STOCK,
            unit: VariantUnit.PIECE,
          })),
        },
      },
    });
    console.log(`Box Blinds catalog: ${name}`);
  }
}

async function seedLadderTapes() {
  const CATEGORY = "Ladder Tapes";
  const cat = await prisma.category.upsert({
    where: { name: CATEGORY },
    update: {},
    create: { name: CATEGORY },
  });

  const existing = await prisma.product.findFirst({
    where: { name: "Ladder Tapes for 50mm Faux Wood", categoryId: cat.id },
  });
  if (!existing) {
    await prisma.product.create({
      data: {
        name: "Ladder Tapes for 50mm Faux Wood",
        categoryId: cat.id,
        hasVariants: true,
        isActive: true,
        variants: {
          create: [
            { size: "White — 25mm tape",        price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "White — 38mm tape",        price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "Light Marble — 25mm tape", price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "Light Marble — 38mm tape", price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "Soft Grey — 25mm tape",    price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "Soft Grey — 38mm tape",    price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "Iron Slate — 25mm tape",   price: 0, stock: 0, unit: VariantUnit.PIECE },
            { size: "Iron Slate — 38mm tape",   price: 0, stock: 0, unit: VariantUnit.PIECE },
          ],
        },
      },
    });
    console.log("Ladder Tapes: Ladder Tapes for 50mm Faux Wood (8 variants)");
  }
}

async function seedBracketsAndSwatches() {
  const CATEGORY = "Brackets & Swatches";
  const cat = await prisma.category.upsert({
    where: { name: CATEGORY },
    update: {},
    create: { name: CATEGORY },
  });

  const items = [
    { name: "Extension Face Fix Brackets", size: "100 pcs/box" },
    { name: "Box Brackets",               size: "100 pcs/box" },
    { name: "Sample Swatch",              size: "Standard"    },
  ];

  for (const item of items) {
    const existing = await prisma.product.findFirst({ where: { name: item.name, categoryId: cat.id } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: item.name,
          categoryId: cat.id,
          hasVariants: false,
          isActive: true,
          variants: { create: [{ size: item.size, price: 0, stock: 0, unit: VariantUnit.PIECE }] },
        },
      });
      console.log(`Brackets & Swatches: ${item.name}`);
    }
  }
}

async function seedToolsAndMachines() {
  const CATEGORY = "Tools & Machines";
  const cat = await prisma.category.upsert({
    where: { name: CATEGORY },
    update: {},
    create: { name: CATEGORY },
  });

  const hoistExisting = await prisma.product.findFirst({
    where: { name: "Inspection Hoist", categoryId: cat.id },
  });
  if (!hoistExisting) {
    await prisma.product.create({
      data: {
        name: "Inspection Hoist",
        categoryId: cat.id,
        hasVariants: false,
        isActive: true,
        variants: {
          create: [{ size: "3m × 3m", price: 0, stock: 0, unit: VariantUnit.PIECE }],
        },
      },
    });
    console.log("Tools & Machines: Inspection Hoist");
  }
}

async function main() {
  const adminName = (process.env.ADMIN_NAME ?? "Olivia Carter").trim();
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@blinds.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "BlindsAdmin#2026!";
  const customerName = (process.env.CUSTOMER_NAME ?? "Ethan Brooks").trim();
  const customerEmail = (process.env.CUSTOMER_EMAIL ?? "user@blinds.com").trim().toLowerCase();
  const customerPassword = process.env.CUSTOMER_PASSWORD ?? "BlindsUser#2026!";

  if (customerEmail === adminEmail) {
    throw new Error("CUSTOMER_EMAIL cannot be the same as ADMIN_EMAIL");
  }

  const rawUrl = process.env.DATABASE_URL ?? "";
  const masked = rawUrl.replace(/:([^:@/]{1,})@/, ":****@");
  console.log(`Seed using DATABASE_URL host: ${masked ? masked.split("@").pop()?.slice(0, 80) : "(missing)"}`);

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const customerPasswordHash = await bcrypt.hash(customerPassword, 12);

  // Reset all existing users and create exactly one admin + one customer.
  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { userId: { not: null } },
      data: { userId: null },
    });
    await tx.user.deleteMany();

    await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
        approved: true,
      },
    });

    await tx.user.create({
      data: {
        name: customerName,
        email: customerEmail,
        passwordHash: customerPasswordHash,
        role: UserRole.CUSTOMER,
        approved: true,
      },
    });
  });

  console.log(`Created admin user: ${adminName} <${adminEmail}>`);
  console.log(`Created customer user: ${customerName} <${customerEmail}>`);
  console.log("Sign in credentials:");
  console.log(`- Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`- Customer: ${customerEmail} / ${customerPassword}`);

  const categories = ["Blinds", "Shades", "Accessories"];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded categories.");

  await seedBoxBlindsCatalog();
  await seedLadderTapes();
  await seedBracketsAndSwatches();
  await seedToolsAndMachines();

  const xlsxPath = resolveProductsXlsxPath();
  if (xlsxPath) {
    await seedFromProductsXlsx(xlsxPath);
  } else {
    console.log("No prisma/Products.xlsx — skip product import.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
