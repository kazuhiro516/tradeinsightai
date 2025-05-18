/*
  Warnings:

  - Added the required column `tradeFileId` to the `trade_records` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "trade_records" ADD COLUMN     "tradeFileId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "trade_records_tradeFileId_idx" ON "trade_records"("tradeFileId");

-- AddForeignKey
ALTER TABLE "trade_records" ADD CONSTRAINT "trade_records_tradeFileId_fkey" FOREIGN KEY ("tradeFileId") REFERENCES "trade_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
