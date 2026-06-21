-- AlterTable: add reference_number column, backfill existing rows, then add NOT NULL + UNIQUE constraints
ALTER TABLE "orders" ADD COLUMN "reference_number" TEXT;

-- Backfill existing orders with a generated reference number based on their created_at date + last 4 chars of id
UPDATE "orders"
SET "reference_number" = 'ORD-' ||
  TO_CHAR("created_at", 'YYYYMMDD') || '-' ||
  UPPER(SUBSTRING("id" FROM LENGTH("id") - 3));

-- Now enforce NOT NULL and UNIQUE
ALTER TABLE "orders" ALTER COLUMN "reference_number" SET NOT NULL;
ALTER TABLE "orders" ADD CONSTRAINT "orders_reference_number_key" UNIQUE ("reference_number");
