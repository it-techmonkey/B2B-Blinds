-- Allow guest orders and store checkout contact details on each order.
ALTER TABLE "orders"
  ALTER COLUMN "user_id" DROP NOT NULL;

ALTER TABLE "orders"
  ADD COLUMN "customer_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_business_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_email" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_phone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_city" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customer_notes" TEXT;
