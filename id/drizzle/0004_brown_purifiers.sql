CREATE TYPE "public"."genders" AS ENUM('male', 'female', 'custom', 'not_specified');--> statement-breakpoint
CREATE TYPE "public"."pronouns" AS ENUM('male', 'female', 'other');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "picture" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "birthdate" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" "genders" DEFAULT 'not_specified' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "genderCustom" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pronouns" "pronouns" DEFAULT 'other' NOT NULL;