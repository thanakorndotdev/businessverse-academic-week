CREATE TABLE "competition" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"phase" text DEFAULT 'qualifier' NOT NULL,
	"finalist_count" smallint DEFAULT 10 NOT NULL,
	"final_opened_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "single_competition_row" CHECK ("competition"."id" = 1),
	CONSTRAINT "competition_phase" CHECK ("competition"."phase" in ('qualifier', 'final', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "final_answers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"option_id" text NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"is_finalist" boolean NOT NULL,
	"fit" double precision NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "student_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_answers" ADD COLUMN "reason" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "finalist_rank" smallint;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "final_points" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "final_answers" ADD CONSTRAINT "final_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_access_code_unique" UNIQUE("access_code");--> statement-breakpoint
INSERT INTO "competition" ("id") VALUES (1) ON CONFLICT DO NOTHING;
