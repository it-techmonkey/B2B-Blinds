-- CreateTable
CREATE TABLE "admin_order_drafts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "customer" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_order_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_order_drafts_client_id_idx" ON "admin_order_drafts"("client_id");

-- AddForeignKey
ALTER TABLE "admin_order_drafts" ADD CONSTRAINT "admin_order_drafts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
