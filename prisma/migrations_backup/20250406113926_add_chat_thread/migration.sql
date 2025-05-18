/*
  Warnings:

  - You are about to drop the column `chatId` on the `chat_messages` table. All the data in the column will be lost.
  - Added the required column `chatThreadId` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "chat_messages_chatId_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "chatId",
ADD COLUMN     "chatThreadId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_threads_userId_idx" ON "chat_threads"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_chatThreadId_idx" ON "chat_messages"("chatThreadId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatThreadId_fkey" FOREIGN KEY ("chatThreadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
