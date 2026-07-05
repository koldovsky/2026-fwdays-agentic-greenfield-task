-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Note_userId_isArchived_idx" ON "Note"("userId", "isArchived");
