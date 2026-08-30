ALTER TABLE "products" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "products_code_key" ON "products"("code") WHERE "code" IS NOT NULL;

ALTER TABLE "product_variants"
  ADD COLUMN "unit_detail" TEXT,
  ADD COLUMN "current_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TYPE "StockAdjustmentType" AS ENUM ('INCREASE', 'DECREASE');
CREATE TYPE "StockAdjustmentReason" AS ENUM ('MISSING', 'FOUND', 'MISPLACED', 'COUNTING_ERROR', 'OTHER');

CREATE TABLE "variant_restocks" (
  "id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "cost_per_unit" DECIMAL(12,2) NOT NULL,
  "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "variant_restocks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "variant_restocks_variant_id_idx" ON "variant_restocks"("variant_id");
ALTER TABLE "variant_restocks" ADD CONSTRAINT "variant_restocks_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "variant_stock_adjustments" (
  "id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "type" "StockAdjustmentType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reason" "StockAdjustmentReason" NOT NULL,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "variant_stock_adjustments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "variant_stock_adjustments_variant_id_idx" ON "variant_stock_adjustments"("variant_id");
ALTER TABLE "variant_stock_adjustments" ADD CONSTRAINT "variant_stock_adjustments_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "order_credit_notes" (
  "id" TEXT NOT NULL,
  "credit_note_number" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_credit_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "order_credit_notes_credit_note_number_key" ON "order_credit_notes"("credit_note_number");
CREATE UNIQUE INDEX "order_credit_notes_order_id_key" ON "order_credit_notes"("order_id");
CREATE INDEX "order_credit_notes_created_at_idx" ON "order_credit_notes"("created_at");
ALTER TABLE "order_credit_notes" ADD CONSTRAINT "order_credit_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
