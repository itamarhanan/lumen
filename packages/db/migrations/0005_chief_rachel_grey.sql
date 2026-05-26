CREATE TABLE "event_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid NOT NULL,
	"event_name" text NOT NULL,
	"description" text,
	"color" text,
	"property_schema" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_event_definitions_site_event" UNIQUE("site_id","event_name")
);
--> statement-breakpoint
ALTER TABLE "event_definitions" ADD CONSTRAINT "event_definitions_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;