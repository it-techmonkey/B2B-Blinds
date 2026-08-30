import { z } from "zod";
import { OrderStatus, PaymentStatus, StockAdjustmentReason, StockAdjustmentType, VariantUnit } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.string().email()),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  businessName: z.string().trim().min(1).max(200),
  email: z.string().email(),
  phone: z.string().trim().min(6).max(40),
  city: z.string().trim().min(1).max(120),
  postcode: z.string().trim().min(1).max(20),
  deliveryAddress: z.string().trim().min(1).max(8000),
  password: z.string().min(8).max(128),
});

export const variantUnitSchema = z.enum([VariantUnit.PIECE, VariantUnit.METER, VariantUnit.BOX, VariantUnit.ROLL]);

export const productVariantInputSchema = z.object({
  size: z.string().min(1).max(200),
  price: z.coerce.number().positive().max(1_000_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000_000),
  unit: variantUnitSchema,
  unitDetail: z.string().trim().max(200).optional().default(""),
  purchaseCost: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
  purchaseNote: z.string().trim().max(1_000).optional().default(""),
});

export const productCreateBaseSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().min(1).max(300),
  categoryId: z.string().min(1),
  hasVariants: z.coerce.boolean(),
  isActive: z.coerce.boolean().optional().default(true),
  variants: z.array(productVariantInputSchema).max(200).optional(),
  price: z.coerce.number().positive().max(1_000_000_000).optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
});

export const productUpdateSchema = z.object({
  code: z.string().trim().min(1).max(100).optional(),
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
  unitDetail: z.string().trim().max(200).optional(),
});

export const productVariantPatchSchema = productVariantWriteSchema.partial();

export const variantRestockSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1_000_000),
  costPerUnit: z.coerce.number().min(0).max(1_000_000_000),
  purchasedAt: z.coerce.date().optional(),
  note: z.string().trim().max(1_000).optional(),
});

export const variantStockAdjustmentSchema = z.object({
  type: z.enum([StockAdjustmentType.INCREASE, StockAdjustmentType.DECREASE]),
  quantity: z.coerce.number().int().positive().max(1_000_000),
  reason: z.enum([
    StockAdjustmentReason.MISSING,
    StockAdjustmentReason.FOUND,
    StockAdjustmentReason.MISPLACED,
    StockAdjustmentReason.COUNTING_ERROR,
    StockAdjustmentReason.OTHER,
  ]),
  note: z.string().trim().max(1_000).optional(),
});

export const creditNoteSchema = z.object({
  reason: z.string().trim().max(1_000).optional(),
});

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
    customerReference: z.string().trim().max(100).optional(),
  }),
});

export const orderStatusSchema = z.object({
  status: z.enum([OrderStatus.CREATED, OrderStatus.SHIPPED, OrderStatus.DELIVERED]),
});

export const orderPaymentStatusSchema = z.object({
  paymentStatus: z.enum([PaymentStatus.UNPAID, PaymentStatus.PAID]),
});

export const profilePatchSchema = z.object({
  businessName: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  postcode: z.string().trim().max(20).optional().nullable(),
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
    return [{ size: "Standard", price: data.price, stock: data.stock, unit: VariantUnit.PIECE, unitDetail: "", purchaseCost: 0, purchaseNote: "Opening stock" }];
  }
  return [];
}
