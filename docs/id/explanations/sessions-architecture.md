# Sessions architecture

This document explains how noo id manages user sessions through a two-layer container session model. It describes the design rationale, security properties, and operational behavior for software engineers, security analysts, and compliance auditors who need to understand the authentication session lifecycle.

## Design goals

The system must support users who switch between multiple accounts (personal and organizational) within the same browser while ensuring that session management remains auditable and resistant to common web application attacks.

Sessions never expose sensitive user data in browser cookies. All session identifiers are opaque and cryptographically protected. The system implements defense-in-depth with multiple verification layers, automatic session rotation, and clear separation between browser-level and user-level session state.

## Container session model

The Identity Provider uses a two-layer session architecture to enable multiple authenticated users within a single browser context.

### Container sessions

A container session represents the browser's relationship with the Identity Provider. Each browser receives exactly one container session that persists across multiple user sign-ins and sign-outs. The container session carries an opaque identifier and a cryptographic verifier that proves browser authenticity.

Container sessions solve the fundamental problem of multiple account support. Without them, signing into a second account would terminate the first session, forcing users to constantly re-authenticate when switching between personal and work accounts. The container acts as a stable anchor that can hold multiple user sessions simultaneously.

### User sessions

User sessions represent individual authenticated identities within a container session. Each successful authentication creates a new user session record linked to the container session. User sessions track authentication metadata (IP address, user agent, timestamps) and maintain the binding between the container and the specific authenticated user.

When a user signs out, only their individual session is destroyed. Other user sessions within the same container remain active, allowing seamless account switching without re-authentication.

## Database schema and relationships

The session system uses two primary tables with a foreign key relationship.

The `container_sessions` table stores the browser-level session state:
- `id`: UUID primary key identifying the container
- `verifierDigest`: Cryptographic hash of the current session verifier
- `version`: Optimistic lock counter for atomic session rotation
- `lastUsedAt`: Timestamp for session activity tracking

The `sessions` table stores user-level authentication state:
- `id`: UUID primary key for the user session
- `containerSessionId`: Foreign key reference to the container session
- `userId`: Reference to the authenticated user account
- `ip`: Client IP address at authentication time
- `userAgent`: Browser user agent string for device tracking
- `lastAuthenticatedAt`: Timestamp of successful authentication
- `lastUsedAt`: Timestamp of most recent session activity

The foreign key relationship ensures referential integrity. When a container session is deleted, all associated user sessions are automatically removed through cascading deletion.

## Cookie implementation

The session system uses two browser cookies with different security properties and purposes.

### Primary session cookie

The `__Host-noo-auth` cookie carries the container session token. It uses the `__Host-` prefix to enforce strict security properties: the cookie must be `Secure`, have `Path=/`, and cannot specify a `Domain` attribute. This prevents subdomain cookie attacks and ensures the cookie is only sent over HTTPS connections.

The cookie is `HttpOnly` to prevent JavaScript access, reducing XSS risk. It uses `SameSite=Lax` to support top-level authentication redirects while blocking cross-site request forgery. The cookie value is an encoded token containing the container session ID and verifier.

### Session check cookie

The `_noo-auth-check` cookie provides a browser-accessible signal for frontend applications. Unlike the primary cookie, this is not `HttpOnly`, allowing JavaScript to detect authentication state changes without calling server endpoints on every page load.

The check cookie contains a cryptographic hash derived from the session token and container version. It changes whenever the session is rotated, enabling immediate detection of sign-in and sign-out events. The value has no authentication significance and cannot be used to impersonate sessions.

## Session lifecycle

### Session establishment

When a browser first visits the Identity Provider without valid session cookies, no container session exists. Authentication flows trigger container session creation during the sign-in process.

The system generates a cryptographic verifier pair: a random verifier string and its corresponding digest. The container session record is created with the digest, and the verifier is embedded in the session token. Both the primary and check cookies are set atomically after successful database commit.

### User authentication

Each successful user authentication creates a new user session linked to the container session. If no container session exists, one is created automatically. The container session verifier is rotated (generating new verifier and digest) to invalidate any potential token replay attacks.

User session creation captures authentication metadata: client IP address, user agent string, and authentication timestamp. This metadata supports security monitoring and session management features like device tracking and suspicious login detection.

### Session rotation

Container sessions use automatic rotation to limit the lifetime of cryptographic material. Rotation occurs during user authentication, privilege elevation events, and certain session management operations.

During rotation, the system generates a new verifier pair and atomically updates the container session record using optimistic locking. The version counter ensures that concurrent rotation attempts are properly serialized. New cookies are issued after successful database commit, maintaining consistency between browser and server state.

### Session termination

User sessions can be terminated individually or collectively. Individual termination removes a specific user session while preserving other sessions in the same container. This enables selective sign-out for account switching scenarios.

When the last user session in a container is removed, the container session itself is destroyed and cookies are cleared. Collective termination (sign out all) destroys the entire container session immediately, invalidating all contained user sessions and clearing browser cookies.

## Security properties

### Cryptographic protection

Session security relies on cryptographic verifiers rather than simple session identifiers. The verifier uses sufficient entropy to resist brute force attacks, and the digest prevents verifier recovery from stored database values.

Session tokens encode both the container session ID and the current verifier. This binding ensures that stolen session IDs cannot be used without the corresponding verifier. Token encoding uses secure serialization that prevents tampering or content disclosure.

### Rotation and invalidation

Automatic session rotation limits the window of vulnerability for compromised session tokens. Rotation invalidates all previously issued tokens for the container session, ensuring that replay attacks have bounded lifetimes.

The optimistic locking mechanism prevents race conditions during concurrent session operations. Version mismatches cause rotation to fail cleanly, maintaining consistency between browser and server state even under high concurrency.

### Cookie security

Session cookies implement multiple layers of protection against common web attacks. The `__Host-` prefix enforces secure transport and prevents subdomain attacks. `HttpOnly` prevents JavaScript access to session tokens. `SameSite=Lax` blocks CSRF while preserving legitimate authentication flows.

The separate check cookie provides authentication state visibility without compromising session security. The hash derivation ensures that check values cannot be reverse-engineered to recover session tokens or verifiers.

## Privacy and compliance considerations

Session data collection is minimal and purpose-limited. IP addresses and user agent strings support security monitoring and fraud detection but are not used for tracking or analytics. Session timestamps enable audit logging and compliance reporting.

The container session model provides natural isolation between different user accounts. Sessions for different users remain separate even when sharing a container, preventing accidental data leakage between accounts.

Session lifecycle events are logged for security monitoring. Logs capture session creation, rotation, and termination events with sufficient detail for incident investigation while avoiding exposure of sensitive session tokens or user data.