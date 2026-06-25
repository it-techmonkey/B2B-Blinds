-- Rename reference_number → order_number
ALTER TABLE "orders" RENAME COLUMN "reference_number" TO "order_number";

-- Rename the unique constraint to match
ALTER TABLE "orders" RENAME CONSTRAINT "orders_reference_number_key" TO "orders_order_number_key";

-- Add optional customer_reference column
ALTER TABLE "orders" ADD COLUMN "customer_reference" TEXT;
