-- CreateTable
CREATE TABLE "saved_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "customer" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_orders_user_id_idx" ON "saved_orders"("user_id");

-- AddForeignKey
ALTER TABLE "saved_orders" ADD CONSTRAINT "saved_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
