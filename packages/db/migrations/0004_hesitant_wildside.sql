ALTER TABLE "sites" ALTER COLUMN "ingest_url" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "entry_page" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_properties" jsonb;