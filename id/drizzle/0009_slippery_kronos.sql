ALTER TABLE "oidc_authorization_codes" ALTER COLUMN "redirect_uri" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "domain" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "oidc_authorization_codes" ADD COLUMN "auth_context" jsonb;--> statement-breakpoint
ALTER TABLE "oidc_clients" ADD COLUMN "internal_client" boolean DEFAULT false NOT NULL;