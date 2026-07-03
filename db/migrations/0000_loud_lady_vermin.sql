CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tariff_plan" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"telegram_username" varchar(255),
	"email" varchar(255),
	"website_url" varchar(255),
	"api_key_hash" varchar(64) NOT NULL,
	"crm_url" varchar(512),
	"crm_login" varchar(255),
	"crm_password" varchar(1024),
	"telephony_url" varchar(512),
	"telephony_login" varchar(255),
	"telephony_password" varchar(1024),
	"telephony_api_key" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_hash_unique" UNIQUE("api_key_hash")
);
--> statement-breakpoint
CREATE TABLE "magic_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tariff_plan" "tariff_plan" NOT NULL,
	"status" "subscription_status" NOT NULL,
	"wallet_id" varchar(255),
	"card_token" varchar(255),
	"amount" integer,
	"currency" varchar(3) DEFAULT '980' NOT NULL,
	"last_invoice_id" varchar(255),
	"failed_attempts_count" integer DEFAULT 0 NOT NULL,
	"last_failed_attempt_at" timestamp with time zone,
	"current_period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"conversion_time" timestamp with time zone NOT NULL,
	"conversion_name" varchar(255) NOT NULL,
	"is_ad_conversion" boolean NOT NULL,
	"email" varchar(255),
	"phone" varchar(255),
	"conversion_value" numeric(10, 2),
	"order_id" varchar(255),
	"ip_address" varchar(45),
	"ad_source" varchar(255),
	"channel" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversions" ADD CONSTRAINT "conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_conversions_user_id_conversion_time" ON "conversions" USING btree ("user_id","conversion_time");--> statement-breakpoint
CREATE INDEX "idx_conversions_conversion_time" ON "conversions" USING btree ("conversion_time");