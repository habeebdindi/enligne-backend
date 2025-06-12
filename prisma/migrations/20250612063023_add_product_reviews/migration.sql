-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "productId" TEXT,
ALTER COLUMN "merchantId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
