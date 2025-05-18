-- DropForeignKey
ALTER TABLE "trade_records" DROP CONSTRAINT "trade_records_tradeFileId_fkey";

-- AddForeignKey
ALTER TABLE "trade_records" ADD CONSTRAINT "trade_records_tradeFileId_fkey" FOREIGN KEY ("tradeFileId") REFERENCES "trade_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
