CREATE TABLE "oidc_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nonce" text,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"claims" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_authorization_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"auth_time" timestamp NOT NULL,
	"redirect_uri" text,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"claims" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"nonce" text,
	"code_challenge" text,
	"code_challenge_method" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oidc_consents" (
	"client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"claims" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oidc_consents_client_id_user_id_pk" PRIMARY KEY("client_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "created_at" TO "last_authenticated_at";--> statement-breakpoint
ALTER TABLE "oidc_clients" ADD COLUMN "registration_access_token_digest" text;--> statement-breakpoint
ALTER TABLE "oidc_access_tokens" ADD CONSTRAINT "oidc_access_tokens_client_id_oidc_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oidc_clients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "oidc_access_tokens" ADD CONSTRAINT "oidc_access_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "oidc_authorization_codes" ADD CONSTRAINT "oidc_authorization_codes_client_id_oidc_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oidc_clients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "oidc_authorization_codes" ADD CONSTRAINT "oidc_authorization_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "oidc_consents" ADD CONSTRAINT "oidc_consents_client_id_oidc_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oidc_clients"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "oidc_consents" ADD CONSTRAINT "oidc_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;