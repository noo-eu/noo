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

The sign-in flow is launched in response to:

- The user visiting any noo application that needs authentication (e.g., https://mail.noo.eu).
- The user directly visiting the sign in page (e.g., https://id.noo.eu/signin).
- The user attempting to sign in to a third party application using their noo account ("Sign in with noo").

Users can authenticate to the an account even if a session is already active, supporting scenarios where `prompt=login` is required in OIDC flows.This enables re-authentication for sensitive operations, like submitting a payment or deleting an account.

## Assets at risk in this flow

- User credentials
- Session tokens
- Access to a user account and all its data
- Accuracy of the authentication process and acr claims
- Service availability (the ability to log in when needed)

### High-level overview of the process

1. The user initiates the sign in procedure, as outlined in the previous section.
2. Primary authentication:

- password based: the user submits username (or email address) and password
- passkey based: the user can authenticate using a passkey as a first method:
  - if the [Conditional UI](https://github.com/w3c/webauthn/wiki/Explainer:-WebAuthn-Conditional-UI) is supported by the user browser, they will be prompted for the passkey as soon as they reach the sign in page.
  - alternatively, they will be able to initiate the passkey flow using a button.

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

## STRIDE analysis

| Threat (STRIDE Category: Specific Threat)          | Description                                                                                                                       | Mitigation(s)                                                                                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S: User spoofing via credential theft/guessing** | Attacker gains access using stolen/guessed credentials (weak passwords, brute-force, credential stuffing).                        | [Secure credential handling](#secure-credential-handling), [Rate limiting](#rate-limiting), [Account lockout](#account-lockout), [Bot detection](#bot-detection), [User education](#user-education) |
| **S: User spoofing via policy bypass**             | Flaws in policy logic allow login satisfying weaker requirements than mandated (e.g., bypass MFA).                                | [Robust policy engine](#robust-policy-engine)                                                                                                                                                       |
| **S: User spoofing via session fixation**          | Attacker forces user into using a session ID known to the attacker.                                                               | [Secure session management](#secure-session-management)                                                                                                                                             |
| **S: ACR spoofing**                                | System issues session/token claiming a higher level of authentication assurance (ACR) than actually performed.                    | [Robust policy engine](#robust-policy-engine), [Audit logging](#audit-logging)                                                                                                                      |
| **S: Dependency threats**                          | Attacker exploits known vulnerabilities in libraries (e.g., WebAuthn, TOTP) used for authentication, gaining unauthorized access. | [Dependency scanning & patching](#dependency-scanning--patching)                                                                                                                                    |
| **S: Replay attacks**                              | Attacker reuses valid session tokens or credentials to impersonate a user.                                                        | [Secure session management](#secure-session-management), [Secure credential handling](#secure-credential-handling)                                                                                  |
| **S: Social engineering**                          | Attacker tricks user into revealing credentials or session tokens (e.g., phishing).                                               | [Suspicious activity detection](#suspicious-activity-detection), [User education](#user-education)                                                                                                  |
| **T: Credential tampering**                        | Modifying credentials (password, TOTP, WebAuthn assertion) in transit or client-side before validation.                           | [HTTPS enforcement](#https-enforcement), [Input validation](#input-validation), [Secure credential handling](#secure-credential-handling)                                                           |
| **T: Policy tampering**                            | Modifying user/tenant attributes or request parameters to receive a weaker policy during evaluation.                              | [Robust policy engine](#robust-policy-engine), [Input validation](#input-validation)                                                                                                                |
| **T: Session cookie tampering**                    | Modifying session ID or other cookie contents client-side.                                                                        | [Secure session management](#secure-session-management)                                                                                                                                             |
| **T: ACR tampering**                               | Modifying parameters influencing ACR calculation/reporting during the flow.                                                       | [Robust policy engine](#robust-policy-engine), [Input validation](#input-validation)                                                                                                                |
| **T: Multi-session state tampering**               | Modifying client-side state to confuse session context.                                                                           | [Multi-session isolation](#multi-session-isolation), [Input validation](#input-validation)                                                                                                          |
| **R: Login actions**                               | Insufficient logging prevents investigation of account compromise or misuse.                                                      | [Audit logging](#audit-logging)                                                                                                                                                                     |
| **I: Username/account enumeration**                | Disclosing valid usernames via differing login error messages or timing attacks.                                                  | [Generic error messages](#generic-error-messages)                                                                                                                                                   |
| **I: Policy detail leakage**                       | Error messages revealing required MFA factors for specific accounts.                                                              | [Generic error messages](#generic-error-messages)                                                                                                                                                   |
| **I: Credential leakage**                          | Accidental exposure of credentials in logs, error reports or insecure transit.                                                    | [Audit logging](#audit-logging), [HTTPS enforcement](#https-enforcement), [Secure credential handling](#secure-credential-handling)                                                                 |
| **I: Session ID leakage**                          | Exposure of session IDs in URLs, logs, or via non-HttpOnly cookies.                                                               | [Secure session management](#secure-session-management)                                                                                                                                             |
| **I: Multi-session information leakage**           | Exposing identifiers/data of other logged-in users via the session switching mechanism.                                           | [Multi-session isolation](#multi-session-isolation)                                                                                                                                                 |
| **D: Login endpoint flooding**                     | Overwhelming the login endpoint via brute-force or credential stuffing attacks.                                                   | [Rate limiting](#rate-limiting), [Account lockout](#account-lockout), [Bot detection](#bot-detection)                                                                                               |
| **D: Account lockout abuse**                       | Maliciously locking out legitimate users via repeated failed login attempts.                                                      | [Account lockout](#account-lockout), [Bot detection](#bot-detection)                                                                                                                                |
| **D: Resource exhaustion**                         | Exploiting expensive operations (complex policy checks, credential hashing) via crafted inputs.                                   | [Rate limiting](#rate-limiting), [Input validation](#input-validation)                                                                                                                              |
| **D: Multi-session state corruption**              | Attacking the state management to prevent users from accessing/switching sessions.                                                | [Multi-session isolation](#multi-session-isolation)                                                                                                                                                 |
| **E: Policy bypass EoP**                           | Gaining privileged access by satisfying a weaker policy than required for the role/account.                                       | [Robust policy engine](#robust-policy-engine)                                                                                                                                                       |
| **E: Session hijacking**                           | Stealing or predicting valid session cookies/IDs.                                                                                 | [Secure session management](#secure-session-management)                                                                                                                                             |
| **E: Multi-session confusion**                     | Gaining privileges/access of User B while operating as User A due to state management flaws.                                      | [Multi-session isolation](#multi-session-isolation)                                                                                                                                                 |
| **E: WebAuthn implementation flaws**               | Incorrect validation of WebAuthn ceremonies/assertions leading to unauthorized access.                                            | [Secure credential handling](#secure-credential-handling), [Dependency Scanning & Patching](#dependency-scanning--patching)                                                                         |

## Mitigation strategies

### Input validation

All inputs should be validated against expected formats and lengths. An easy way to overwhelm a server, for example, is to send an extremely long password, which will cause the server to spend a lot of time hashing it.

### Secure credential handling

Strong password hashing (Argon2id), time-constant comparison, and secure storage of TOTP secrets.

### Rate limiting

Per-IP and per-user rate limiting on login attempts. Consider using a token bucket algorithm to allow bursts of activity while still enforcing limits. It could also be possible to reject sign-in requests that are impossibly fast (ie: less than 1 second after loading the form).

IP reputation services can be used to identify and block known malicious IP addresses before they even reach the application.

### Account lockout

A double-edged sword. After a predefined number of failed attempts, lock the account for a short period to slow down automated attacks. Increase the lockout duration with each subsequent failure to deter brute-force attacks.

Always allow the user to unlock their account via passkeys, or alternative, active authentication methods (NFC ID cards?).

### Bot detection

CAPTCHAs can be too agressive and annoying, especially for users with disabilities. Nonetheless, it's possible to successfully identify bots using a combination of heuristics.

Simpler strategies to stop automated attacks, like honeypot fields, can go a long way.

### Generic error messages

It shouldn't be immediately clear to the attacker whether the username or the password was incorrect. While it's often impossible to fully prevent username enumeration (attempting to sign up will reveal whether the username is already taken), we can at least avoid making it straightforward.

### HTTPS enforcement

All traffic should be encrypted using HTTPS, between the user and the service, between the service and any internal or external dependency, including the database.

To make sure that browsers refuse to downgrade requests to HTTP, we must enforce Strict Transport Security (HSTS) and include the `upgrade-insecure-requests` header in all responses.

### Secure session management

Properly managing user sessions is essential to prevent session hijacking and fixation attacks. This includes:

- Making sure that session cookies are inaccessible to Javascript (HttpOnly)
- Setting the `Secure` flag on cookies to ensure they are only sent over HTTPS (an excess of caution if HSTS is enforced, but a good practice nonetheless)
- Determining the appropriate `SameSite` attribute for cookies to prevent CSRF attacks
- Regenerating session IDs upon authentication, refresh, and then periodically, to reduce the risk of hijacking.
- Expiration policies, likely different for public and enterprise users.

### Robust policy engine

Securely fetch and enforce policies; validate inputs affecting policy.

### Audit logging

Maintain comprehensive logs of authentication events, including successful and failed login attempts, policy evaluations, and session management actions. This aids in incident response and forensic analysis.

This needs to be balanced with user privacy and data retention policies. Especially for very privacy-conscious users, we might want to avoid logging the full IP address or user agent, even on failed attempts (this may be a flag in the user settings, balancing risk with privacy).

### Multi-session isolation

Our multi-session feature allows users to have multiple sessions in the same browser. This is useful for users who want to be logged in to multiple accounts at the same time, but it can also lead to confusion and security issues if not properly managed.

### Dependency scanning & patching

Keep libraries (WebAuthn, TOTP, framework) updated and regularly scan for vulnerabilities. Use tools like `npm audit` or Github dependabot to identify and update vulnerable dependencies.

### User education

Promote secure user behaviour to minimize social engineering risks. This may include awareness training, password hygiene and phishing detection.

### Suspicious activity detection

Monitor for unusual login patterns, such as multiple failed attempts, logins from new devices or locations, impossible travels, and other anomalies. Implement alerts for suspicious activities and consider additional verification steps in such cases.
