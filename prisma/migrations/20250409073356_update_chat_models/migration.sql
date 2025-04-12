/*
  Warnings:

  - You are about to drop the column `chatThreadId` on the `chat_messages` table. All the data in the column will be lost.
  - You are about to drop the `chat_threads` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `chatRoomId` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_chatThreadId_fkey";

-- DropForeignKey
ALTER TABLE "chat_threads" DROP CONSTRAINT "chat_threads_userId_fkey";

-- DropIndex
DROP INDEX "chat_messages_chatThreadId_idx";

-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "chatThreadId",
ADD COLUMN     "chatRoomId" TEXT NOT NULL;

-- DropTable
DROP TABLE "chat_threads";

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_rooms_userId_idx" ON "chat_rooms"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_idx" ON "chat_messages"("chatRoomId");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
