-- CreateTable
CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filter" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_filters_userId_idx" ON "saved_filters"("userId");

-- CreateIndex
CREATE INDEX "saved_filters_type_idx" ON "saved_filters"("type");

-- CreateIndex
CREATE UNIQUE INDEX "saved_filters_userId_type_isDefault_key" ON "saved_filters"("userId", "type", "isDefault");

-- AddForeignKey
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
