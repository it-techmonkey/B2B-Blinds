import { Prisma, VariantUnit } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, NotFoundError } from "@/server/errors";

function decimalToString(d: Prisma.Decimal): string {
  return d.toFixed(2);
}

const variantInclude = { orderBy: { size: "asc" as const } };

export type VariantInput = {
  size: string;
  price: number;
  stock: number;
  unit: VariantUnit;
};

function assertVariantShape(hasVariants: boolean, variants: VariantInput[]) {
  if (hasVariants) {
    if (variants.length < 2) {
      throw new AppError("Variant products need at least two sizes/options", 400, "VARIANTS_REQUIRED");
    }
  } else if (variants.length !== 1) {
    throw new AppError("Simple product needs exactly one price/stock line (single variant)", 400, "SIMPLE_VARIANT");
  }
}

export function serializeVariant(v: { id: string; size: string; price: Prisma.Decimal; stock: number; unit: VariantUnit }) {
  return {
    id: v.id,
    size: v.size,
    price: decimalToString(v.price),
    stock: v.stock,
    unit: v.unit,
  };
}

export function serializeProductListRow(
  p: Prisma.ProductGetPayload<{ include: { category: true; variants: true } }>
) {
  const variants = p.variants.map(serializeVariant);
  let minP = p.variants[0]?.price ?? new Prisma.Decimal(0);
  let maxP = p.variants[0]?.price ?? new Prisma.Decimal(0);
  for (const v of p.variants) {
    if (v.price.lt(minP)) minP = v.price;
    if (v.price.gt(maxP)) maxP = v.price;
  }
  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
  return {
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    category: p.category,
    hasVariants: p.hasVariants,
    isActive: p.isActive,
    variants,
    priceFrom: decimalToString(minP),
    priceTo: decimalToString(maxP),
    totalStock,
  };
}

export async function listProductsPublic(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const where = { isActive: true };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
      include: { category: true, variants: variantInclude },
    }),
    prisma.product.count({ where }),
  ]);
  return {
    data: items.map(serializeProductListRow),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function listProductsAdmin(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { category: true, variants: variantInclude },
    }),
    prisma.product.count(),
  ]);
  return {
    data: items.map(serializeProductListRow),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getProductById(id: string) {
  const p = await prisma.product.findUnique({
    where: { id },
    include: { category: true, variants: variantInclude },
  });
  if (!p) throw new NotFoundError("Product not found");
  return serializeProductListRow(p);
}

export async function createProduct(input: {
  name: string;
  categoryId: string;
  hasVariants: boolean;
  isActive: boolean;
  variants: VariantInput[];
}) {
  assertVariantShape(input.hasVariants, input.variants);
  return prisma.product.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      hasVariants: input.hasVariants,
      isActive: input.isActive,
      variants: {
        create: input.variants.map((v) => ({
          size: v.size,
          price: new Prisma.Decimal(v.price),
          stock: v.stock,
          unit: v.unit,
        })),
      },
    },
    include: { category: true, variants: variantInclude },
  });
}

export async function updateProduct(
  id: string,
  patch: Partial<{ name: string; categoryId: string; hasVariants: boolean; isActive: boolean }>
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!existing) throw new NotFoundError("Product not found");

  const nextHasVariants = patch.hasVariants ?? existing.hasVariants;
  const vCount = existing.variants.length;

  if (nextHasVariants && vCount < 2) {
    throw new AppError("Add at least two variants before enabling multiple variants", 400, "NEED_VARIANTS");
  }
  if (!nextHasVariants && vCount !== 1) {
    throw new AppError("Simple product must have exactly one variant — remove extra variants first", 400, "TOO_MANY_VARIANTS");
  }

  const data: Prisma.ProductUpdateInput = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.categoryId !== undefined) data.category = { connect: { id: patch.categoryId } };
  if (patch.hasVariants !== undefined) data.hasVariants = patch.hasVariants;
  if (patch.isActive !== undefined) data.isActive = patch.isActive;

  const p = await prisma.product.update({
    where: { id },
    data,
    include: { category: true, variants: variantInclude },
  });
  return p;
}

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product not found");
  await prisma.product.delete({ where: { id } });
}

export async function createVariant(
  productId: string,
  input: VariantInput
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  const created = await prisma.productVariant.create({
    data: {
      productId,
      size: input.size,
      price: new Prisma.Decimal(input.price),
      stock: input.stock,
      unit: input.unit,
    },
  });
  const n = await prisma.productVariant.count({ where: { productId } });
  if (n >= 2) {
    await prisma.product.update({ where: { id: productId }, data: { hasVariants: true } });
  }
  return created;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  input: Partial<VariantInput>
) {
  const v = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  });
  if (!v) throw new NotFoundError("Variant not found");

  const data: Prisma.ProductVariantUpdateInput = {};
  if (input.size !== undefined) data.size = input.size;
  if (input.price !== undefined) data.price = new Prisma.Decimal(input.price);
  if (input.stock !== undefined) data.stock = input.stock;
  if (input.unit !== undefined) data.unit = input.unit;

  if (Object.keys(data).length === 0) {
    throw new AppError("No fields to update", 400);
  }

  return prisma.productVariant.update({
    where: { id: variantId },
    data,
  });
}

export async function deleteVariant(productId: string, variantId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  const v = product.variants.find((x) => x.id === variantId);
  if (!v) throw new NotFoundError("Variant not found");

  if (product.variants.length <= 1) {
    throw new AppError("Cannot delete the last variant", 400, "LAST_VARIANT");
  }

  const orderCount = await prisma.orderItem.count({ where: { variantId } });
  if (orderCount > 0) {
    throw new AppError("Variant used on past orders — cannot delete", 409, "VARIANT_IN_USE");
  }

  await prisma.productVariant.delete({ where: { id: variantId } });

  const remaining = await prisma.productVariant.count({ where: { productId } });
  if (remaining === 1) {
    await prisma.product.update({
      where: { id: productId },
      data: { hasVariants: false },
    });
  }
}
