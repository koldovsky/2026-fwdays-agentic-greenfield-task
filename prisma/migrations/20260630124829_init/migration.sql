-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "food_per" AS ENUM ('100g', '100ml', 'portion', 'piece', 'dish');

-- CreateEnum
CREATE TYPE "meal" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

-- CreateEnum
CREATE TYPE "food_source" AS ENUM ('fact', 'estimate');

-- CreateEnum
CREATE TYPE "review_period" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "chat_id" BIGINT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "sex" TEXT,
    "height_cm" INTEGER,
    "activity" TEXT,
    "goal" TEXT,
    "tz" TEXT NOT NULL DEFAULT 'Europe/Kyiv',
    "target_kcal" INTEGER,
    "target_protein_g" DECIMAL(7,2),
    "target_fat_g" DECIMAL(7,2),
    "target_carbs_g" DECIMAL(7,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_database" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "per" "food_per" NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein_g" DECIMAL(7,2) NOT NULL,
    "fat_g" DECIMAL(7,2) NOT NULL,
    "carbs_g" DECIMAL(7,2) NOT NULL,
    "user_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_database_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "meal" "meal" NOT NULL,
    "entry_name" TEXT NOT NULL,
    "qty" DECIMAL(8,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein_g" DECIMAL(7,2) NOT NULL,
    "fat_g" DECIMAL(7,2) NOT NULL,
    "carbs_g" DECIMAL(7,2) NOT NULL,
    "source" "food_source" NOT NULL,
    "food_db_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_metrics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" DECIMAL(6,2),
    "waist_cm" DECIMAL(6,2),
    "chest_cm" DECIMAL(6,2),
    "hips_cm" DECIMAL(6,2),
    "bicep_cm" DECIMAL(6,2),
    "thigh_cm" DECIMAL(6,2),
    "conditions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "body_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "period" "review_period" NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "body" TEXT NOT NULL,
    "reviewed_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_chat_id_key" ON "users"("chat_id");

-- CreateIndex
CREATE INDEX "food_database_user_id_idx" ON "food_database"("user_id");

-- CreateIndex
CREATE INDEX "food_log_user_id_date_idx" ON "food_log"("user_id", "date");

-- CreateIndex
CREATE INDEX "body_metrics_user_id_date_idx" ON "body_metrics"("user_id", "date");

-- CreateIndex
CREATE INDEX "reviews_user_id_period_idx" ON "reviews"("user_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_period_period_start_key" ON "reviews"("user_id", "period", "period_start");

-- AddForeignKey
ALTER TABLE "food_database" ADD CONSTRAINT "food_database_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_log" ADD CONSTRAINT "food_log_food_db_id_fkey" FOREIGN KEY ("food_db_id") REFERENCES "food_database"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_metrics" ADD CONSTRAINT "body_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

