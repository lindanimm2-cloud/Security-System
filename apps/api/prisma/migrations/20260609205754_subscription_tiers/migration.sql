-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "addons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tier_code" TEXT NOT NULL DEFAULT 'ESSENTIAL';

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYFAST',
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "tier_code" TEXT,
    "addon_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_reference_key" ON "payment_transactions"("reference");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_idx" ON "payment_transactions"("user_id");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "subscriptions"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
