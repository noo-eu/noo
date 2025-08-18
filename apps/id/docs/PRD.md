# **Product Requirements Document: noo id (v1.2 Final)**

## **1. Introduction & Vision**

**noo id** is the cornerstone of the noo ecosystem. The single, secure key to a
user's digital world. It will serve as the trusted identity provider for the
entire suite of noo applications (Email, Calendar, Storage) and, in the future,
for third-party services that share our values. Our goal is to provide a
seamless, privacy-preserving authentication experience that empowers both
individuals and European businesses.

### **1.1. Problem Statement**

European citizens and businesses lack a native, sovereign digital identity
solution that is compliant-by-design with regulations like GDPR and is not
beholden to non-EU corporate interests. This creates friction for users
concerned about privacy and for businesses in regulated industries needing
compliant technology partners. **noo id** will solve this by providing a
unified, secure, and transparent identity system built on European soil and
values.

## **2. Goals & Success Metrics (MVP)**

The primary goal of the MVP is to provide a robust and secure authentication
foundation for the initial noo application suite.

## **3. Key User Flows**

### **3.1. Individual User Onboarding**

1.  A user lands on `mail.noo.eu` and initiates the "Sign Up" process, which is handled by the `id.noo.eu` service.
2.  The user provides a unique **username**, a **name**, and a **password**. The system provides real-time validation and password strength feedback.
3.  A Proof-of-Work (PoW) challenge is executed in the browser to prevent abusive automated sign-ups.
4.  Upon success, the account is created, the user is logged in, and a welcome email is sent to their new `username@noo.eu` address.
5.  The user's profile page will prominently recommend adding a second factor (Passkey or TOTP).

### **3.2. Business Tenant Creation & First User Invite**

1.  A user initiates the "Create Organization" process from the business landing page.
2.  The user provides an **organization name**. The user's own details are used to create the first administrator account.
3.  The tenant is created at `id.noo.eu/oidc/<tenant_id>`, and the administrator is logged into the admin dashboard.
4.  From the dashboard, the administrator can invite a new user by providing an email address and assigning them to a group.
5.  An invitation email with a unique, time-limited (72h) link is sent.
6.  The invitee clicks the link, sets their password, and is successfully added to the business tenant.

### **3.3. Business Tenant with a mail Domain name**

1.  A user initiates the "Create Organization" process from the business landing page.
2.  The user provides an **organization name** and a domain name (e.g., `acme.com`).
3.  The user's own details are used to create the first administrator account.
4.  The domain name is verified through a DNS challenge (e.g., TXT record).
5.  The tenant is created at `id.noo.eu/oidc/<tenant_id>`, and the administrator is logged into the admin dashboard.
6.  From the dashboard, the administrator can create new users, manage groups, and configure settings for the business tenant.
7.  The administrator can also invite external users, like in the previous flow.

### **3.4. Additional flows**

- Sign in
- Sign out
- View session history
- Terminate remote sessions
- Change profile information (name, birthdate, profile picture)
- Sign in to a third party application

For tenant administrators:

- create or invite, manage and delete users
- manage user roles and permissions
- assign users to groups
- create, manage and delete OIDC applications and assign them to groups
- view audit logs

---

## **4. Functional & Non-Functional Requirements**

### **4.1. Authentication & Security**

| Feature                 | Requirement                                                                                                                                                                                                                                                                     |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Password Hashing**    | **Argon2id** with parameters: 256 MB memory, 2 iterations, 1 parallelism.                                                                                                                                                                                                       |
| **Password Policy**     | Individuals: ≥10 characters at signup, with a mandatory upgrade to zxcvbn score ≥3 within 60 days. Tenants: tunable. All passwords checked against HIBP.                                                                                                                        |
| **TOTP**                | 8 digits, 30s timestep, SHA-1 algorithm. Single device per account. ±5s clock skew tolerance.                                                                                                                                                                                   |
| **Passkeys (WebAuthn)** | `rpId` = `id.noo.eu`. User Verification (`uv`) is **required**. Platform & roaming authenticators accepted. Attestation policy is `none` for MVP.                                                                                                                               |
| **Account Recovery**    | **Emergency Passphrase:** Opt-in, 24-word (BIP-39) with Shamir’s Secret Sharing. **Unrecoverable by Design:** If a user loses their primary credential and has not configured a recovery method, the account is **permanently lost**. There is no administrative recovery path. |
| **Cooling-Off Period**  | A 24-hour cooling-off period shall be enforced after high-risk events like account recovery, during which sensitive actions (e.g., removing other factors) are blocked. The exact mechanics require a technical design spike.                                                   |
| **Anti-Abuse**          | **Proof-of-Work (PoW):** SHA-256 challenge enforced at signup and for Tor/VPN logins. The challenge difficulty escalates on repeated failures.                                                                                                                                  |

### **4.2. OIDC, Sessions & Tokens**

| Feature                | Requirement                                                                                                       |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Issuer Model**       | Path-based per tenant: `https://id.noo.eu/oidc/{TENANT}`.                                                         |
| **Subject Identifier** | Per-tenant pairwise (`sub`) by default to prevent cross-tenant correlation.                                       |
| **Token Lifetimes**    | **Authorization Code:** 120 seconds. **ID/Access Token:** 1 hour. **Clock Skew Tolerance:** ±2 minutes.           |
| **JWT Signing**        | Default: **EdDSA/Ed25519**. Also support RS256, P-256 per client. Keys rotated annually with a 60-day overlap.    |
| **Session Cookies**    | **OP Cookie:** `_noo_session` (SameSite=None; Secure). **App Cookie:** `_noo_app_session` (SameSite=Lax; Secure). |
| **Session Lifetime**   | No absolute expiry. Sessions are locked after 30 days of inactivity, requiring re-authentication.                 |
| **Logout**             | Global sign-out via OIDC front-channel and back-channel logout.                                                   |

### **4.3. Tenancy & Administration**

| Feature               | Requirement                                                                                                                                                                |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Identifiers**  | "Naked tenants" (no domain) use an identifier like `username@TENANT.noo.eu` for display, but applications must rely on the `sub` claim.                                    |
| **Groups Claim**      | `noo:groups`. To prevent token bloat, a `noo:groups_hash` will be sent if the list exceeds a threshold, with a full list available at a paged `/userinfo/groups` endpoint. |
| **Admin Permissions** | No built-in roles beyond "Administrator." MVP permission primitives: Manage Users, Manage Groups, Manage OIDC Clients, View Audit Logs.                                    |
| **Audit Logs**        | Retained for 90 days by default. Includes key events like logins, consent changes, factor enrollment, and admin actions.                                                   |

### **4.4. User Trust & Transparency**

| Feature                    | Requirement                                                                                                                                                            |
| :------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transparency Dashboard** | A public, real-time dashboard shall be provided, showing anonymized system health, uptime, security audit summaries, and aggregated statistics on legal data requests. |
| **Data Portability**       | The system shall provide a simple, one-click feature for users to export all of their personal and account data in a standard, machine-readable format (e.g., JSON).   |

### **4.5. System & Data Architecture**

| Feature              | Requirement                                                                                                                                                                                                                        |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database Tenancy** | The system will use a single PostgreSQL database. Tenant data isolation will be at the application level.                                                                                                                          |
| **Billing Hooks**    | The system must log events to determine if a user "seat" was active within a given calendar month. It must also support flagging tenants/users with specific "addons" (e.g., "Extended Audit Logs") to enable future monetization. |

### **4.6. Non-Functional Requirements**

| Category               | Requirement                                                                                                       |
| :--------------------- | :---------------------------------------------------------------------------------------------------------------- |
| **Data Residency**     | All production data, logs, and backups will be stored **strictly within the EU**.                                 |
| **Hosting**            | Active-active High Availability across two EU providers: **Hetzner (Falkenstein) & Scaleway (Paris)**.            |
| **Performance**        | RPO: ≤30 minutes. RTO: 5 minutes. Initial target: 1 million sign-ins per month (peaks of 10 per second expected). |
| **Transport Security** | TLS 1.3 preferred (1.2 fallback). HSTS with `includeSubDomains` + `preload` enabled.                              |
| **Accessibility**      | Target **WCAG 2.1 Level AA** compliance for all user-facing interfaces.                                           |
| **Localization**       | All 24 official EU languages supported at launch using AI-driven translation.                                     |
| **Browser Support**    | Latest two versions of evergreen browsers (Chrome, Firefox, Edge, Safari) and the current Tor Browser ESR.        |

---

## **5. Out of Scope (For MVP)**

The following features and capabilities are explicitly out of scope for the v1.0 release to ensure a focused and timely launch. They will be considered for future releases.

- **SAML 2.0 Federation:** Support for acting as a SAML Identity Provider (IdP) to enable SSO for legacy enterprise applications.
- **SCIM Provisioning:** An inbound SCIM 2.0 endpoint for automated user provisioning from external systems.
- **Outbound SCIM:** Support for exporting user data to external systems via SCIM.
- **Third-Party SSO:** Actively onboarding and supporting third-party applications is post-MVP.
- **eIDAS Integration:** Full integration for verified identity is a future goal.
- **Refresh Tokens for Browser Clients:** The MVP will use an OIDC bootstrap + opaque session model.
- **Parental Consent for Minors:** Workflows for handling accounts for minors are deferred.
