-- CreateTable
CREATE TABLE "user_mt4_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "loginId" TEXT NOT NULL,
    "encryptedInvestorPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mt4_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_mt4_accounts_userId_idx" ON "user_mt4_accounts"("userId");

-- AddForeignKey
ALTER TABLE "user_mt4_accounts" ADD CONSTRAINT "user_mt4_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
