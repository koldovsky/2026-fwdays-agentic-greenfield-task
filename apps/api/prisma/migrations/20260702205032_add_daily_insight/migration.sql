-- CreateTable
CREATE TABLE "DailyInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyInsight_userId_idx" ON "DailyInsight"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyInsight_userId_localDate_key" ON "DailyInsight"("userId", "localDate");

-- AddForeignKey
ALTER TABLE "DailyInsight" ADD CONSTRAINT "DailyInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
