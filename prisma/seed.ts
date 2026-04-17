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

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "BlindsAdmin#2026!";

  const rawUrl = process.env.DATABASE_URL ?? "";
  const masked = rawUrl.replace(/:([^:@/]{1,})@/, ":****@");
  console.log(`Seed using DATABASE_URL host: ${masked ? masked.split("@").pop()?.slice(0, 80) : "(missing)"}`);

  const existing = await prisma.user.findFirst({
    where: { email: { equals: adminEmail, mode: "insensitive" } },
  });
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  } else if (existing.role === UserRole.ADMIN) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { email: adminEmail, passwordHash },
    });
    console.log(`Synced admin password for: ${adminEmail} (role ADMIN; uses ADMIN_PASSWORD or seed default)`);
  } else {
    console.warn(
      `Cannot seed admin: ${existing.email} exists as ${existing.role}. Use another ADMIN_EMAIL or remove that user.`
    );
  }

  console.log(`Sign in with email: ${adminEmail} and the password from ADMIN_PASSWORD (default: BlindsAdmin#2026!)`);

  const categories = ["Blinds", "Shades", "Accessories"];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seeded categories.");

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
