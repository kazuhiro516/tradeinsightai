-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_records" (
    "id" TEXT NOT NULL,
    "ticket" INTEGER NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "item" TEXT NOT NULL,
    "openPrice" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "closeTime" TIMESTAMP(3),
    "closePrice" DOUBLE PRECISION NOT NULL,
    "commission" DOUBLE PRECISION,
    "taxes" DOUBLE PRECISION,
    "swap" DOUBLE PRECISION,
    "profit" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tradeFileId" TEXT NOT NULL,

    CONSTRAINT "trade_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trade_files" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadDate" TIMESTAMP(3) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trade_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatRoomId" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_filter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filter" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_filter_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "users_supabaseId_key" ON "users"("supabaseId");

-- CreateIndex
CREATE INDEX "trade_records_userId_idx" ON "trade_records"("userId");

-- CreateIndex
CREATE INDEX "trade_records_ticket_idx" ON "trade_records"("ticket");

-- CreateIndex
CREATE INDEX "trade_records_openTime_idx" ON "trade_records"("openTime");

-- CreateIndex
CREATE INDEX "trade_records_item_idx" ON "trade_records"("item");

-- CreateIndex
CREATE INDEX "trade_records_tradeFileId_idx" ON "trade_records"("tradeFileId");

-- CreateIndex
CREATE UNIQUE INDEX "trade_records_userId_ticket_key" ON "trade_records"("userId", "ticket");

-- CreateIndex
CREATE INDEX "trade_files_userId_idx" ON "trade_files"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_idx" ON "chat_messages"("chatRoomId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "chat_rooms_userId_idx" ON "chat_rooms"("userId");

-- CreateIndex
CREATE INDEX "saved_filter_userId_idx" ON "saved_filter"("userId");

-- CreateIndex
CREATE INDEX "user_mt4_accounts_userId_idx" ON "user_mt4_accounts"("userId");

-- AddForeignKey
ALTER TABLE "trade_records" ADD CONSTRAINT "trade_records_tradeFileId_fkey" FOREIGN KEY ("tradeFileId") REFERENCES "trade_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_records" ADD CONSTRAINT "trade_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_files" ADD CONSTRAINT "trade_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_filter" ADD CONSTRAINT "saved_filter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mt4_accounts" ADD CONSTRAINT "user_mt4_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

