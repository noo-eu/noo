> [!NOTE]
> This document is an example documentation article. It does not describe or represent any real system or implementation.

# Cookies used by our Identity Provider

This document explains how the Identity Provider (IdP) uses browser cookies: what each cookie is for, how long it lives, how it is scoped, and why it exists. It is written for contributors and reviewers who need to understand the model and its security and privacy properties—software engineers, architects, analysts, and compliance auditors.

## Design goals

The cookie model balances three needs: secure authentication, reliable session management, and low exposure of personal data. Cookies never carry tokens or personally identifying information; they only carry opaque identifiers or signed hints. All cookies are `Secure`; session-bearing cookies are `HttpOnly`. We prefer `SameSite=Lax` for top-level navigation flows and avoid cross-site contexts unless a specific feature demands it. When a feature must work cross-site, we document the rationale and add compensating controls.

We keep responsibilities separate. One cookie represents the authenticated session identifier. Another, non-HttpOnly cookie provides a browser-visible hint for SPAs to detect sign-in and sign-out. Anti-CSRF state and other correlation data are short-lived and purpose-bound. This separation limits blast radius and makes behavior auditable.

## Lifecycle and state model

Before authentication, the browser may hold only short-lived correlation artifacts issued by the authorization request. During authentication, the IdP binds the browser to a server-side session and sets a session cookie after successful sign-in. If multi-factor authentication (MFA) is required, the session enters a “pending additional verification” state; the session cookie exists but is not authorized for full scope until MFA completes. After sign-in, the browser may also receive a non-HttpOnly hint so front-end applications can react to session changes without calling userinfo on every page load.

On sign-out, the IdP clears the session cookie and updates the hint so relying parties can detect the change. Front-channel logout notifies browser clients; back-channel logout notifies server clients. If the tenant enables global sign-out, the IdP invalidates all sessions for that subject within the tenant and clears any device-trust cookies.

## Cookie inventory

This section explains the purpose and rationale of each cookie category. The registry page lists the exact names, flags, paths, and lifetimes.

### Session identifier (HttpOnly)

The session cookie stores an opaque server-side session ID. It is `HttpOnly`, `Secure`, and scoped to the IdP host. It uses `SameSite=Lax` to support top-level authentication redirects while resisting cross-site requests. The server rotates the underlying session record on privilege elevation and at regular intervals to mitigate fixation. The value is either a random identifier or a compact, signed envelope containing only what the server needs to locate session state. No personal data appears in the cookie.

### Anti-CSRF state

When the IdP renders forms or performs stateful POSTs, it sets a CSRF token bound to the browser. We prefer the `__Host-` prefix where supported, which enforces `Secure`, `Path=/`, and no `Domain` attribute. The CSRF value is random, short-lived, and validated on submission using the double-submit pattern or a server-side binding. It is deleted promptly after use.

### Authorization flow correlation

During the authorization flow, the IdP binds the browser’s request to a specific transaction. Correlation artifacts (for example, an authorization request nonce or an interaction handle) are short-lived, scoped to the IdP, and used only to match the browser callback to the original request. They are not reused across flows and are removed automatically on completion or timeout.

### Consent and preferences (optional)

If the tenant requires consent or cookie preferences, the IdP may set a small, non-personal cookie to record that decision. It records the choice and an expiry only. If regulations require proof, the server stores the consent record; the cookie is merely a browser-side reminder.

## Tenant and domain scoping

Tenants are isolated. Cookies set for one tenant cannot be read by another. The IdP achieves this by using distinct hosts per tenant or by careful `Domain` scoping that never crosses tenant boundaries. Shared, global cookies are avoided. When custom (vanity) domains are used, the IdP sets cookies on that domain to keep behavior consistent with the tenant’s chosen host. We do not set cookies on broad parent domains that could enable leakage across tenants.

## SameSite strategy

The IdP sets session cookies with `SameSite=Lax` so that authentication initiated by a top-level navigation succeeds while cross-site subresource requests are denied. If a feature requires cross-site embedding—for example, an organization that embeds the IdP in an iframe—the IdP documents the risk, limits scope to that feature, and applies additional controls such as short lifetimes, frame ancestors restrictions, and strong origin checks. We avoid `SameSite=None` unless strictly necessary, and then only over `Secure` TLS connections.

## Security properties

Session confidentiality relies on `HttpOnly` and TLS. Client-side scripts cannot read the session identifier, which prevents most XSS exfiltration. Integrity and authenticity rely on server-side session storage or signed envelopes with rotating keys. The IdP regenerates session identifiers after sign-in, role elevation, and sensitive settings changes. Logout clears the session cookie and invalidates the server record; front-channel logout changes the hint immediately so SPAs can react.

CSRF protections use purpose-bound tokens and the browser’s `SameSite` enforcement. Replay risks are mitigated with timestamps and nonce binding where applicable. If a non-HttpOnly cookie is present, it is strictly a hint and carries no authentication value.

## Privacy and compliance

Cookies are part of personal data processing when they can be linked to an individual. The IdP minimizes personal data in cookies: values are opaque identifiers or signed markers with no direct identifiers, roles, or attributes. Retention is limited to what the feature requires. The registry documents for each cookie the purpose, lawful basis where applicable, retention period, and whether the value is considered personal data in the relevant jurisdiction.

Consent requirements depend on local regulation and cookie purpose. Security-essential cookies (session, CSRF) are strictly necessary. Preference or analytics cookies, if any, require opt-in where mandated. The privacy notice and data processing agreement describe these uses; the registry provides the implementer-facing detail that auditors can map to those disclosures.

Audit logs record when cookies of interest are set or cleared as part of authentication events. Logs contain identifiers, not raw cookie values. Diagnostics that print cookie headers are redacted by default.
