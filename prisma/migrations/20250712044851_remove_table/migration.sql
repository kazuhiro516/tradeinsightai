/*
  Warnings:

  - You are about to drop the `ai_model_system_prompts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_mt4_accounts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ai_model_system_prompts" DROP CONSTRAINT "ai_model_system_prompts_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_mt4_accounts" DROP CONSTRAINT "user_mt4_accounts_userId_fkey";

-- DropTable
DROP TABLE "ai_model_system_prompts";

-- DropTable
DROP TABLE "user_mt4_accounts";
