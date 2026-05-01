-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "customer_name" DROP DEFAULT,
ALTER COLUMN "customer_business_name" DROP DEFAULT,
ALTER COLUMN "customer_email" DROP DEFAULT,
ALTER COLUMN "customer_phone" DROP DEFAULT,
ALTER COLUMN "customer_city" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
