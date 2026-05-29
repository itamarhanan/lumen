CREATE TABLE "event_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"description" text,
	"properties_schema" jsonb NOT NULL,
	"enforce_strict" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_event_schemas_site_event" UNIQUE("site_id","event_name")
);
--> statement-breakpoint
ALTER TABLE "event_schemas" ADD CONSTRAINT "event_schemas_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;