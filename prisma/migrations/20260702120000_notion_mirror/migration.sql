-- CreateEnum
CREATE TYPE "notion_source_table" AS ENUM ('food_log', 'food_database', 'body_metrics', 'review');

-- CreateEnum
CREATE TYPE "notion_sync_status" AS ENUM ('pending', 'done', 'failed', 'dead');

-- CreateEnum
CREATE TYPE "notion_auth_type" AS ENUM ('env', 'oauth');

-- CreateTable
CREATE TABLE "notion_sync" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "source_table" "notion_source_table" NOT NULL,
    "source_id" INTEGER NOT NULL,
    "notion_page_id" TEXT,
    "status" "notion_sync_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_sync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notion_config" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "auth_type" "notion_auth_type" NOT NULL,
    "credential_ref" TEXT NOT NULL,
    "db_foodlog_id" TEXT NOT NULL,
    "db_reviews_id" TEXT NOT NULL,
    "db_metrics_id" TEXT NOT NULL,
    "db_fooddb_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notion_sync_status_next_attempt_at_idx" ON "notion_sync"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "notion_sync_source_table_source_id_idx" ON "notion_sync"("source_table", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "notion_config_user_id_key" ON "notion_config"("user_id");

-- AddForeignKey
ALTER TABLE "notion_sync" ADD CONSTRAINT "notion_sync_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notion_config" ADD CONSTRAINT "notion_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
