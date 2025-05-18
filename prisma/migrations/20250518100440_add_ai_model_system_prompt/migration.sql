-- CreateTable
CREATE TABLE "ai_model_system_prompts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_model_system_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_system_prompts_userId_key" ON "ai_model_system_prompts"("userId");

-- CreateIndex
CREATE INDEX "ai_model_system_prompts_userId_idx" ON "ai_model_system_prompts"("userId");

-- AddForeignKey
ALTER TABLE "ai_model_system_prompts" ADD CONSTRAINT "ai_model_system_prompts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
