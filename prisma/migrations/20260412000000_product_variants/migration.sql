-- CreateEnum
CREATE TYPE "VariantUnit" AS ENUM ('PIECE', 'METER');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "has_variants" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unit" "VariantUnit" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- Backfill: one "Standard" variant per product (PIECE), copy price/stock
INSERT INTO "product_variants" ("id", "product_id", "size", "price", "stock", "unit", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", 'Standard', "price", "stock", 'PIECE'::"VariantUnit", NOW(), NOW()
FROM "products";

-- AlterTable order_items
ALTER TABLE "order_items" ADD COLUMN "variant_id" TEXT,
ADD COLUMN "size_snapshot" TEXT;

UPDATE "order_items" oi
SET
  "variant_id" = pv."id",
  "size_snapshot" = pv."size"
FROM (
  SELECT DISTINCT ON ("product_id") "id", "product_id", "size"
  FROM "product_variants"
  ORDER BY "product_id", "created_at" ASC
) pv
WHERE oi."product_id" = pv."product_id";

ALTER TABLE "order_items" ALTER COLUMN "variant_id" SET NOT NULL;

-- Drop old columns from products
ALTER TABLE "products" DROP COLUMN "price",
DROP COLUMN "stock";

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
