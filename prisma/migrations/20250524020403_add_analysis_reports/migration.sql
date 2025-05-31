-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analysis_reports_userId_idx" ON "analysis_reports"("userId");

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
