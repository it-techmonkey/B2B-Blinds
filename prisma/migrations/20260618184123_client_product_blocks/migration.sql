-- CreateTable
CREATE TABLE "client_product_blocks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_product_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_product_blocks_user_id_idx" ON "client_product_blocks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "client_product_blocks_user_id_product_id_key" ON "client_product_blocks"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "client_product_blocks" ADD CONSTRAINT "client_product_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_product_blocks" ADD CONSTRAINT "client_product_blocks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
