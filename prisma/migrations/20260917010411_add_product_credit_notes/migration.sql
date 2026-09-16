-- AlterTable
ALTER TABLE "users" ADD COLUMN     "allow_credit_without_purchase" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_credit_notes" (
    "id" TEXT NOT NULL,
    "credit_note_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_credit_notes_credit_note_number_key" ON "product_credit_notes"("credit_note_number");

-- CreateIndex
CREATE INDEX "product_credit_notes_user_id_idx" ON "product_credit_notes"("user_id");

-- CreateIndex
CREATE INDEX "product_credit_notes_variant_id_idx" ON "product_credit_notes"("variant_id");

-- AddForeignKey
ALTER TABLE "product_credit_notes" ADD CONSTRAINT "product_credit_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_credit_notes" ADD CONSTRAINT "product_credit_notes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_credit_notes" ADD CONSTRAINT "product_credit_notes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
