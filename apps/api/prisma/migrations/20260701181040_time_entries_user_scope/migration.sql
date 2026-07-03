/*
  Warnings:

  - Added the required column `userId` to the `TimeEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "TimeEntry_startedAt_idx";

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "TimeEntry_userId_startedAt_idx" ON "TimeEntry"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
