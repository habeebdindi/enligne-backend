-- CreateTable
CREATE TABLE "Disbursement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "phoneNumber" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_reference_key" ON "Disbursement"("reference");

-- CreateIndex
CREATE INDEX "Disbursement_type_idx" ON "Disbursement"("type");

-- CreateIndex
CREATE INDEX "Disbursement_status_idx" ON "Disbursement"("status");

-- CreateIndex
CREATE INDEX "Disbursement_phoneNumber_idx" ON "Disbursement"("phoneNumber");

-- CreateIndex
CREATE INDEX "Disbursement_reference_idx" ON "Disbursement"("reference");

-- CreateIndex
CREATE INDEX "Disbursement_createdAt_idx" ON "Disbursement"("createdAt");

-- CreateIndex
CREATE INDEX "Disbursement_scheduledFor_idx" ON "Disbursement"("scheduledFor");

-- CreateIndex
CREATE INDEX "Disbursement_processedAt_idx" ON "Disbursement"("processedAt");

-- CreateIndex
CREATE INDEX "Disbursement_completedAt_idx" ON "Disbursement"("completedAt");
