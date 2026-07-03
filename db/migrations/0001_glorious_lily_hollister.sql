CREATE TABLE "pending_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint,
	"telegram_username" varchar(255),
	"email" varchar(255),
	"website_url" varchar(255),
	"is_completed" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_registrations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(6) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pending_registrations_token" ON "pending_registrations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_pending_registrations_telegram_id" ON "pending_registrations" USING btree ("telegram_id");--> statement-breakpoint
CREATE INDEX "idx_otp_codes_user_id" ON "otp_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_otp_codes_code" ON "otp_codes" USING btree ("code");