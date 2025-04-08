# Threat Model for noo id: authentication

**[Related Overview](00-introduction.md)**

This document details the threat model for the user authentication (sign-in) flow of the **noo id** service. This flow is critical as it guards access to user accounts and the broader **noo** ecosystem. It covers various authentication methods including passwords, passkeys (WebAuthn), and multi-factor authentication (MFA) like TOTP.

## What is the authentication flow?

The authentication (or sign-in) flow is the process by which users prove their identity to gain access to their accounts. The most common method is through a username and password. The exact steps can vary based on the user configuration, tenant policies, and specific requirements coming from 3rd-party applications (RPs) using OpenID Connect (OIDC).

This flexibility allows for fine-tuning the authentication process to meet the needs of the most demanding use cases, but it comes at the cost of increased business logic complexity, which can in turn lead to security vulnerabilities.

### Preconditions

To use the sign in flow, we must assume that the user:
- has already an account at noo (either as a public user, with a @noomail.eu address, or registered by an enterprise administrator)
- has probably a password and additional authentication factors (TOTP or passkeys) as part of their account settings.

The authentication flow is launched in response to:

- The user visiting any noo application that needs authentication (e.g., https://mail.noo.eu).
- The user directly visiting the sign in page (e.g., https://id.noo.eu/signin).
- The user attempting to sign in to a third party application using their noo account ("Sign in with noo").

Users can authenticate to the an account even if a session is already active, supporting scenarios where `prompt=login` is required in OIDC flows.This enables re-authentication for sensitive operations, like submitting a payment or deleting an account.

### High-level overview of the process

1. The user initiates the sign in procedure, as outlined in the previous section.
2. Primary authentication:
  - password based: the user submits username (or email address) and password
  - passkey based: the user can authenticate using a passkey as a first method:
    - if the [Conditional UI](https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Conditional-UI) is supported by the user browser, they will be prompted for the passkey as soon as they reach the sign in page.
    - alternatively, they will be able to initiate the passkey authentication flow using a button.
3. The **noo id** backend verifies the credentials against the database. An authentication policy is determined based on the user type and settings:
  - for public users, a password or a passkey is sufficient. TOTP or passkeys may be required if configured.
  - for enterprise users, the policies set up by administrators will determine which additional factors are required. Each OIDC client can also be set up to enforce additional requirements.
4. If required by the user's settings or policy, the backend the backend requests additional factors. Verification continues until all required factors are succesfully provided.
5. Once the user has successfully authenticated, a session is established or refreshed. The session includes:
  - Identifier
  - Verifier (hashed form)
  - user ID
  - time of authentication
  - methods used to authenticate the user.
  A token is generated, combining the session identifier and plaintext verifier. This token is stored in the user browser as a secure cookie. Note that **noo id** supports multiple sessions per browser. The session cookie is composed of all the session tokens, separated by a space.
6. The user is sent back to their intended destination, which may be a noo service or a third-party application.

## Assets at risk in this flow

* User credentials
* Session tokens
* Access to a user account and all its data
* Accuracy of the authentication process and acr claims
* Service availability (the ability to log in when needed)

## STRIDE analysis


| Threat (STRIDE Category: Specific Threat) | Description | Likelihood | Impact | Mitigation(s) |
|---|---|---|---|---|
| **S: User Spoofing via Credential Theft/Guessing** | Attacker gains access using stolen/guessed credentials (phishing, weak passwords, brute-force, credential stuffing). | `[TBD]` | High | `[Secure Credential Handling](#secure-credential-handling)`, `[Rate Limiting](#rate-limiting)`, `[Account Lockout](#account-lockout)`, `[Bot Detection](#bot-detection)` |
| **S: User Spoofing via Policy Bypass** | Flaws in policy logic allow login satisfying weaker requirements than mandated (e.g., bypass MFA). | `[TBD]` | High | `[Robust Policy Engine](#robust-policy-engine)` |
| **S: User Spoofing via Session Fixation** | Attacker forces user into using a session ID known to the attacker. | `[TBD]` | Medium | `[Secure Session Management](#secure-session-management)` |
| **S: ACR Spoofing** | System issues session/token claiming a higher level of authentication assurance (ACR) than actually performed. | `[TBD]` | Medium | `[Robust Policy Engine](#robust-policy-engine)`, `[Detailed Audit Logging](#detailed-audit-logging)` |
| **S: Multi-Session Spoofing** `[TODO]` | Manipulating session switching mechanism to act as another logged-in user. | `[TBD]` | High | `[Multi-Session Isolation](#multi-session-isolation)` |
| **T: Credential Tampering** | Modifying credentials (password, TOTP, WebAuthn assertion) in transit or client-side before validation. | `[TBD]` | High | `[HTTPS Enforcement](#https-enforcement)`, `[Input Validation](#Input-validation)`, `[Secure Credential Handling](#secure-credential-handling)` |
| **T: Policy Tampering** | Modifying user/tenant attributes or request parameters to receive a weaker policy during evaluation. | `[TBD]` | High | `[Robust Policy Engine](#robust-policy-engine)`, `[Input Validation](#input-validation)` |
| **T: Session Cookie Tampering** | Modifying session ID or other cookie contents client-side. | `[TBD]` | High | `[Secure Session Management](#secure-session-management)` |
| **T: ACR Tampering** | Modifying parameters influencing ACR calculation/reporting during the flow. | `[TBD]` | Medium | `[Robust Policy Engine](#robust-policy-engine)`, `[Input Validation](#input-validation)` |
| **T: Multi-Session State Tampering** `[TODO]` | Modifying client-side state (e.g., localStorage, JS variables) to confuse session context. | `[TBD]` | High | `[Multi-Session Isolation](#multi-session-isolation)`, `[Input Validation](#input-validation)` |
| **R: Login Actions** | Insufficient logging prevents investigation of account compromise or misuse. | `[TBD]` | Medium | `[Detailed Audit Logging](#detailed-audit-logging)` |
| **I: Username/Account Enumeration** | Disclosing valid usernames via differing login error messages or timing attacks. | `[TBD]` | Low | `[Generic Error Messages](#generic-error-messages)` |
| **I: Policy Detail Leakage** | Error messages revealing required MFA factors for specific accounts. | `[TBD]` | Low | `[Generic Error Messages](#generic-error-messages)` |
| **I: Credential Leakage** | Accidental exposure of credentials in logs, error reports (Sentry), insecure transit, or via browser autocomplete. | `[TBD]` | High | `[Detailed Audit Logging](#detailed-audit-logging)` (Filter sensitive data), `[HTTPS Enforcement](#https-enforcement)`, `[Secure Credential Handling](#secure-credential-handling)` |
| **I: Session ID Leakage** | Exposure of session IDs in URLs, logs, or via non-HttpOnly cookies. | `[TBD]` | High | `[Secure Session Management](#secure-session-management)` |
| **I: Multi-Session Information Leakage** `[TODO]` | Exposing identifiers/data of other logged-in users via the session switching mechanism. | `[TBD]` | Medium | `[Multi-Session Isolation](#multi-session-isolation)` |
| **D: Login Endpoint Flooding** | Overwhelming the login endpoint via brute-force or credential stuffing attacks. | `[TBD]` | Medium | `[Rate Limiting](#rate-limiting)`, `[Account Lockout](#account-lockout)`, `[Bot Detection](#bot-detection)` |
| **D: Account Lockout Abuse** | Maliciously locking out legitimate users via repeated failed login attempts. | `[TBD]` | Medium | `[Account Lockout](#account-lockout)` (Careful policy design), `[Bot Detection](#bot-detection)` |
| **D: Resource Exhaustion** | Exploiting expensive operations (complex policy checks, credential hashing) via crafted inputs. | `[TBD]` | Medium | `[Rate Limiting](#rate-limiting)`, `[Input Validation](#input-validation)`, Efficient implementation |
| **D: Multi-Session State Corruption** `[TODO]` | Attacking the state management to prevent users from accessing/switching sessions. | `[TBD]` | Medium | `[Multi-Session Isolation](#multi-session-isolation)` |
| **E: MFA Bypass** | Exploiting logic flaws in the MFA/Step-up process to skip required factors. | `[TBD]` | High | `[Robust Policy Engine](#robust-policy-engine)`, Careful state management |
| **E: Policy Bypass EoP** | Gaining privileged access by satisfying a weaker policy than required for the role/account. | `[TBD]` | High | `[Robust Policy Engine](#robust-policy-engine)` |
| **E: Session Hijacking** | Stealing or predicting valid session cookies/IDs. | `[TBD]` | High | `[Secure Session Management](#secure-session-management)` |
| **E: Multi-Session Confusion EoP** `[TODO]` | **CRITICAL.** Gaining privileges/access of User B while operating as User A due to state management flaws. | `[TBD]` | High | `[Multi-Session Isolation](#multi-session-isolation)` |
| **E: WebAuthn Implementation Flaws** | Incorrect validation of WebAuthn ceremonies/assertions leading to unauthorized access. | `[TBD]` | High | `[Secure Credential Handling](#secure-credential-handling)` (Use vetted libraries), `[Dependency Scanning & Patching](#dependency-scanning--patching)` |

## Mitigation strategies

### Input validation
Sanitize all inputs (username format, etc.).

### Secure credential handling
Strong password hashing (Argon2id/bcrypt), secure passkey handling (relying on robust libraries/platform APIs), secure TOTP  validation.

### Rate ;imiting
Apply to login attempts per IP, per user.

### Account ;ockout
Implement temporary lockouts after failed attempts.

### Bot detection
CAPTCHA or similar after suspicious activity.

### Generic error messages
Avoid username enumeration.

### HTTPS enforcement
HSTS header.

### Secure session management
HttpOnly, Secure, SameSite cookies; regenerate ID on login; server-side state preferred; adequate expiry.

### Robust policy engine
Securely fetch and enforce policies; validate inputs affecting policy.

### Detailed audit logging
Log all auth attempts, factor usage, policy applied, success/failure, source IP.

### Multi-session isolation
Meticulous client-side and server-side state separation.

### Dependency scanning & patching
Keep libraries (WebAuthn, TOTP, framework) updated.
