CREATE TYPE "public"."role" AS ENUM('attendee', 'admin');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_th" text NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"is_q1_unlocked" boolean DEFAULT false NOT NULL,
	"q1_unlocked_at" timestamp with time zone,
	"display_order" integer NOT NULL,
	CONSTRAINT "departments_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"question_number" smallint NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"multi" boolean DEFAULT false NOT NULL,
	"budget" integer,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option_index" integer NOT NULL,
	"explanation" text NOT NULL,
	"points_reward" integer DEFAULT 100 NOT NULL,
	CONSTRAINT "question_number_range" CHECK ("questions"."question_number" between 1 and 3),
	CONSTRAINT "valid_correct_option" CHECK ("questions"."correct_option_index" >= 0 and "questions"."correct_option_index" < jsonb_array_length("questions"."options"))
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"question_number" smallint NOT NULL,
	"selected_option_index" integer NOT NULL,
	"option_ids" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"points_earned" double precision NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_number" serial NOT NULL,
	"objective_id" text DEFAULT 'growth' NOT NULL,
	"student_id" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'attendee' NOT NULL,
	"total_points" double precision DEFAULT 0 NOT NULL,
	"last_submission_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_team_number_unique" UNIQUE("team_number"),
	CONSTRAINT "users_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "department_question_unique" ON "questions" USING btree ("department_id","question_number");--> statement-breakpoint
CREATE UNIQUE INDEX "user_question_unique" ON "user_answers" USING btree ("user_id","question_id");--> statement-breakpoint
CREATE INDEX "user_department_idx" ON "user_answers" USING btree ("user_id","department_id");--> statement-breakpoint
CREATE INDEX "ranking_idx" ON "users" USING btree ("total_points" DESC NULLS LAST,"last_submission_at","id");