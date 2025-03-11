import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  domain: text().unique().notNull(),
  oidcRegistrationTokenDigest: text("oidc_registration_token_digest"),
});

export const genderEnum = pgEnum("genders", [
  "male",
  "female",
  "custom",
  "not_specified",
]);
export const pronounEnum = pgEnum("pronouns", ["male", "female", "other"]);

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    username: text().notNull(),
    normalizedUsername: text("normalized_username").notNull(),
    passwordDigest: text("password_digest"),
    passwordChangedAt: timestamp("last_password_changed_at", { mode: "date" }),
    passwordBreaches: integer("password_breaches").notNull().default(0),
    passwordBreachesCheckedAt: timestamp("password_breaches_checked_at", {
      mode: "date",
    }),
    otpSecret: text("otp_secret"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    picture: text(),
    birthdate: date({ mode: "date" }),
    gender: genderEnum().notNull().default("not_specified"),
    genderCustom: text("gender_custom"),
    pronouns: pronounEnum().notNull().default("other"),
  },
  (table) => [
    unique("users_tenant_id_normalized_username")
      .on(table.tenantId, table.normalizedUsername)
      .nullsNotDistinct(),
  ],
);

export const sessions = pgTable("sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  verifierDigest: text("verifier_digest").notNull(),
  ip: inet().notNull(),
  userAgent: text("user_agent"),
  lastAuthenticatedAt: timestamp("last_authenticated_at")
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
});

export const oidcClients = pgTable("oidc_clients", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  clientSecret: text("client_secret").notNull(),
  registrationAccessTokenDigest: text("registration_access_token_digest"),
  redirectUris: text("redirect_uris").array().notNull(),
  responseTypes: text("response_types").array().notNull().default(["code"]),
  grantTypes: text("grant_types")
    .array()
    .notNull()
    .default(["authorization_code"]),
  applicationType: text("application_type").notNull().default("web"),
  contacts: text("contacts").array(),
  clientName: jsonb("client_name").$type<{
    [key: string]: string;
  }>(),
  logoUri: jsonb("logo_uri"),
  clientUri: jsonb("client_uri"),
  policyUri: jsonb("policy_uri"),
  tosUri: jsonb("tos_uri"),
  jwksUri: text("jwks_uri"),
  jwks: jsonb("jwks"),
  sectorIdentifierUri: text("sector_identifier_uri"),
  subjectType: text("subject_type").notNull().default("pairwise"),
  idTokenSignedResponseAlg: text("id_token_signed_response_alg")
    .notNull()
    .default("RS256"),
  userinfoSignedResponseAlg: text("userinfo_signed_response_alg"),
  requestObjectSigningAlg: text("request_object_signing_alg"),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method")
    .notNull()
    .default("client_secret_basic"),
  tokenEndpointAuthSigningAlg: text("token_endpoint_auth_signing_alg"),
  defaultMaxAge: integer("default_max_age"),
  requireAuthTime: boolean("require_auth_time").notNull().default(false),
  defaultAcrValues: text("default_acr_values").array(),
  initiateLoginUri: text("initiate_login_uri"),
  requestUris: text("request_uris").array(),
  postLogoutRedirectUris: text("post_logout_redirect_uris").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oidcAuthorizationCodes = pgTable("oidc_authorization_codes", {
  id: text().primaryKey(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => oidcClients.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  authTime: timestamp("auth_time").notNull(),
  redirectUri: text("redirect_uri"),
  scopes: text().array().notNull().default([]),

  // Claims here are a JSON object as defined by the OIDC spec
  claims: jsonb().notNull().default({}).$type<{
    userinfo?: Record<string, unknown>;
    id_token?: Record<string, unknown>;
  }>(),
  nonce: text(),
  codeChallenge: text("code_challenge"),
  codeChallengeMethod: text("code_challenge_method"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const oidcConsents = pgTable(
  "oidc_consents",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => oidcClients.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    scopes: text().array().notNull().default([]),
    // Claims here are a simple array of claims that the user has consented to provide
    claims: text().array().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.userId] })],
);

export const oidcAccessTokens = pgTable("oidc_access_tokens", {
  id: uuid().primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => oidcClients.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  nonce: text(),
  scopes: text().array().notNull().default([]),
  // Claims here are a JSON object as defined by the OIDC spec
  claims: jsonb().notNull().default({}).$type<{
    userinfo?: Record<string, unknown>;
    id_token?: Record<string, unknown>;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions),
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantRelations = relations(tenants, ({ many }) => ({
  users: many(users),
}));
