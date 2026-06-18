-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pricing_discount" DECIMAL(5,2),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "approved" SET DEFAULT false;

-- CreateTable
CREATE TABLE "client_price_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_price_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_price_overrides_user_id_idx" ON "client_price_overrides"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_price_overrides_user_id_variant_id_key" ON "client_price_overrides"("user_id", "variant_id");

-- AddForeignKey
ALTER TABLE "client_price_overrides" ADD CONSTRAINT "client_price_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_price_overrides" ADD CONSTRAINT "client_price_overrides_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
