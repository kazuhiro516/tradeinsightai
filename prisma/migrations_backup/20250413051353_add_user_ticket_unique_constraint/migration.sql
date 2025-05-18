/*
  Warnings:

  - A unique constraint covering the columns `[userId,ticket]` on the table `trade_records` will be added. If there are existing duplicate values, this will fail.
  - Made the column `closePrice` on table `trade_records` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "trade_records" ALTER COLUMN "closePrice" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "trade_records_userId_ticket_key" ON "trade_records"("userId", "ticket");
