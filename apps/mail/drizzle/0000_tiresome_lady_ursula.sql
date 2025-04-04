CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verifier_digest" text NOT NULL,
	"session_data" jsonb NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
