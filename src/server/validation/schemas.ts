import { z } from "zod";
import { OrderStatus, VariantUnit } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const variantUnitSchema = z.enum([VariantUnit.PIECE, VariantUnit.METER]);

export const productVariantInputSchema = z.object({
  size: z.string().min(1).max(200),
  price: z.coerce.number().positive().max(1_000_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000_000),
  unit: variantUnitSchema,
});

export const productCreateBaseSchema = z.object({
  name: z.string().min(1).max(300),
  categoryId: z.string().min(1),
  hasVariants: z.coerce.boolean(),
  isActive: z.coerce.boolean().optional().default(true),
  variants: z.array(productVariantInputSchema).max(200).optional(),
  price: z.coerce.number().positive().max(1_000_000_000).optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  categoryId: z.string().min(1).optional(),
  hasVariants: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const productVariantWriteSchema = z.object({
  size: z.string().min(1).max(200),
  price: z.coerce.number().positive().max(1_000_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000_000),
  unit: variantUnitSchema,
});

export const productVariantPatchSchema = productVariantWriteSchema.partial();

export const orderItemInputSchema = z.object({
  productId: z.preprocess(
    (v) => (v == null ? "" : String(v).trim()),
    z.string().min(1)
  ),
  variantId: z.preprocess(
    (v) => {
      if (v == null) return undefined;
      const s = String(v).trim();
      return s.length > 0 ? s : undefined;
    },
    z.string().min(1).optional()
  ),
  quantity: z.preprocess(
    (q) => {
      if (q == null) return Number.NaN;
      if (typeof q === "number") return q;
      if (typeof q === "string") return Number.parseInt(q.trim(), 10);
      return Number(q);
    },
    z.number().int().positive().max(1_000_000)
  ),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1).max(100),
  customer: z.object({
    name: z.string().trim().min(1).max(200),
    businessName: z.string().trim().min(1).max(200),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().min(6).max(40),
    city: z.string().trim().min(1).max(120),
    notes: z.string().trim().max(500).optional().default(""),
  }),
});

export const orderStatusSchema = z.object({
  status: z.enum([OrderStatus.CREATED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
});

export const profilePatchSchema = z.object({
  businessName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  invoiceAddress: z.string().trim().max(8000).optional().nullable(),
  deliveryAddress: z.string().trim().max(8000).optional().nullable(),
});

export const adminCreateOrderSchema = createOrderSchema.extend({
  userId: z.string().min(1),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export function resolveProductCreateVariants(
  data: z.infer<typeof productCreateBaseSchema>
): z.infer<typeof productVariantInputSchema>[] {
  const variants = data.variants;
  if (variants && variants.length > 0) return variants;
  if (!data.hasVariants && data.price != null && data.stock != null) {
    return [{ size: "Standard", price: data.price, stock: data.stock, unit: VariantUnit.PIECE }];
  }
  return [];
}
