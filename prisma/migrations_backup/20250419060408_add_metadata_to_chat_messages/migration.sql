/*
  Warnings:

  - You are about to drop the `saved_filters` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "saved_filters" DROP CONSTRAINT "saved_filters_userId_fkey";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "metadata" JSONB;

-- DropTable
DROP TABLE "saved_filters";

-- CreateTable
CREATE TABLE "saved_filter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filter" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_filter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_filter_userId_idx" ON "saved_filter"("userId");

-- CreateIndex
CREATE INDEX "saved_filter_type_idx" ON "saved_filter"("type");

-- AddForeignKey
ALTER TABLE "saved_filter" ADD CONSTRAINT "saved_filter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
