-- OrderStatus: CREATED | CONFIRMED | COMPLETED -> CREATED | SHIPPED | DELIVERED
CREATE TYPE "OrderStatus_new" AS ENUM ('CREATED', 'SHIPPED', 'DELIVERED');

ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "OrderStatus_new"
  USING (
    CASE "status"::text
      WHEN 'CONFIRMED' THEN 'SHIPPED'::"OrderStatus_new"
      WHEN 'COMPLETED' THEN 'DELIVERED'::"OrderStatus_new"
      ELSE "status"::text::"OrderStatus_new"
    END
  );

ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'CREATED'::"OrderStatus_new";

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

-- User profile + approval
ALTER TABLE "users" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "business_name" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "invoice_address" TEXT;
ALTER TABLE "users" ADD COLUMN "delivery_address" TEXT;
