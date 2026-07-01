-- CreateTable
CREATE TABLE "progress_notes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "observations" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_notes_user_id_date_idx" ON "progress_notes"("user_id", "date");

-- AddForeignKey
ALTER TABLE "progress_notes" ADD CONSTRAINT "progress_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
