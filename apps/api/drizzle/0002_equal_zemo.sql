ALTER TABLE "final_answers" ADD COLUMN "selections" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "final_answers" ADD COLUMN "assessment" jsonb;