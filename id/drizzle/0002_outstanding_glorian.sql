CREATE TABLE "oidc_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"client_secret" text NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"response_types" text[] DEFAULT '{"code"}' NOT NULL,
	"grant_types" text[] DEFAULT '{"authorization_code"}' NOT NULL,
	"application_type" text DEFAULT 'web' NOT NULL,
	"contacts" text[],
	"client_name" jsonb,
	"logo_uri" jsonb,
	"client_uri" jsonb,
	"policy_uri" jsonb,
	"tos_uri" jsonb,
	"jwks_uri" text,
	"jwks" jsonb,
	"sector_identifier_uri" text,
	"subject_type" text DEFAULT 'pairwise' NOT NULL,
	"id_token_signed_response_alg" text DEFAULT 'RS256' NOT NULL,
	"userinfo_signed_response_alg" text,
	"request_object_signing_alg" text,
	"token_endpoint_auth_method" text DEFAULT 'client_secret_basic' NOT NULL,
	"token_endpoint_auth_signing_alg" text,
	"default_max_age" integer,
	"require_auth_time" boolean DEFAULT false NOT NULL,
	"default_acr_values" text[],
	"initiate_login_uri" text,
	"request_uris" text[],
	"post_logout_redirect_uris" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "oidc_registration_token_digest" text;--> statement-breakpoint
ALTER TABLE "oidc_clients" ADD CONSTRAINT "oidc_clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE cascade;