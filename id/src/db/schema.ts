import {
  boolean,
  inet,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  domain: text().unique().notNull(),
  oidcRegistrationTokenDigest: text("oidc_registration_token_digest").notNull(),
});

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
    otpSecret: text("otp_secret"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
});

export const oidcClients = pgTable("oidc_clients", {
  id: uuid().primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  clientSecret: text("client_secret").notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  responseTypes: text("response_types").array().notNull().default(["code"]),
  grantTypes: text("grant_types")
    .array()
    .notNull()
    .default(["authorization_code"]),
  applicationType: text("application_type").notNull().default("web"),
  contacts: text("contacts").array(),
  clientName: jsonb("client_name"),
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
