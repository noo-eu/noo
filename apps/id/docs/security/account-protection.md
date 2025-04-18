# Account protection features

This document describes how noo id protects accounts from unauthorized access
during the authentication process. This is not an user guide, but a technical
reference for developers, auditors, and security experts.

## Types of attacks

The sign-in process is one of the most sensitive parts of any application. It is
the entry point to the user's account and the gateway to their data. As such, it
is expected to be the target of a variety of attacks.

Broadly, we can categorize these attacks into two types:

- **Attempts at taking over any account**: attacks that are not interested in
  compromising a specific account, but rather in taking over any account. An
  attacker may be interested in collecting users PII or gaining access to
  emails, which in turn may grant access to more sensitive information like
  bank or social media accounts.

  A common example of this type of attack is **password spraying**, where an
  attacker tries to log in to a large number of accounts using a small number
  of common passwords (e.g. "123456", "password", etc.).

  Alternatively, **credential stuffing** is a type of attack where an attacker
  uses a list of previously compromised usernames and passwords from other
  services. This can work because users often reuse passwords across multiple
  platforms.

- **Attacks against a specific account**: These attacks are targeted at a
  specific user. The attacker may be interested in obtaining sensitive
  information, such as financial data, impersonating the user to commit fraud,
  stealing the user identity, black mail, or even compromising the user's
  physical security by obtaining their location.

  Attacks of this type will usually involve phishing, social engineering, SIM
  swapping, or other techniques to obtain the user's credentials.
  Alternatively, an attacker may try to brute-force the password, using a
  dictionary of common passwords, or testing with previously compromised
  usernames and passwords from other services.

## Guiding principles and strategies

Regardless of the type of attack, we rely on a few different strategies to
protect our users:

- **Prevention**: while we cannot always prevent a user from giving away their
  credentials to an attacker (phishing, keyloggers, etc.), we can implement
  measures to effectively prevent password spraying, dictionary attacks, and
  credential stuffing. The primary way we achieve this is by preventing, or
  strongly discouraging, the use of weak or compromised passwords.
- **Discouraging**: determined, persistent and financially motivated attackers
  can be difficult to stop. Nonetheless we can make it significantly harder
  and more expensive for anyone to even attempt to mount an attack. This is an
  effective measure to resist against generic, non targeted attacks. If an
  attacker has to spend time and money to design a custom attack, they may
  simply decide to move to easier targets.
- **Slowing it down**: this goes hand in hand with the previous point. As part
  of our discouraging measures, for example, we will require the clients to
  submit a Proof-of-Work (PoW) to the server. This will require the client to
  perform a computationally (and to a point, economically) expensive task,
  which will slow down the attack. This can be carefully paired with rate
  limits to defend against even against large botnets.
- **Adding more layers**: passwords have always been, and are destined to
  remain, the weakest link in an authentication system. It doesn't matter how
  long or complex a password is if a user can simply fall for a look-alike
  phishing site. Having more authentication factors, like:
  - TOTP codes
  - software and hardware tokens (Passkeys), which may have a biometric unlock
  - push notifications with number matching
  can effectively prevent an attacker from accessing the account, even in
  scenarios where the password is compromised.
- **Education**: the best security practices cannot save a user from themselves.
  Password-sharing, reuse, using search engines to open our website (maybe
  clicking on an Ad), installing malware, etc are all common practices that
  can lead to account compromise. As an example, in countries that have
  implemented a Digital Identity system (like Belgium, Italy, Estonia,
  Singapore), it is quite common to simply give away ones credentials to
  friends, accountants or lawyers when in need of help. Users rarely fully
  undestand the implications of doing so, and it is our responsibility to
  educate them on this and other practices.

## Limitations

Given the vast and multi-faceted nature of our system, from an enterprise
authentication system to a privacy-focused consumer product, we may have to
apply and layer different measures, depending on the context.

For example, most services will outright forbid an authentication attempt coming
from the Tor network. This is understandable, and reasonable, since Tor is
commonly used to hide the identity of an attacker. On the other hand, doing so
would prevent legitimate users with important privacy concerns from accessing
their accounts.

On the other hand, enterprise users will commonly attempt sign-ins from networks
(ASNs) identified as data-centers (for example, through AWS Workspaces or a VPN
exit node within a Cloud network). These networks are also often blocked by
default, as Clouds provide an easy way to rent "attack power".

A common and effective mechanism to prevent account takeover is simply to
lockout an account after a number of failed attempts. While this is a very
strong defence mechanism, it also risks being abused to become a vector for
Denial of Service. An attacker may voluntarily repeat a number of failures in
order to prevent a legitimate user from signing in.

All of this clearly highlights the need for nuanced and contextualized measures.
We may allow attempts from Tor for consumer accounts and block them for
enterprises, or we may allow attempts from data-centers for enterprise accounts
and block them for consumers. Account lockouts may be possible for enterprises,
where an administrator can be contacted to unlock the account, but not for
consumers, where the user may not have a backup mechanism to regain access to
their own account.

## Measures

### Password strength

The first line of defense against password spraying, credential stuffing and
dictionary attacks is a good password. Over time, the effectiveness of
requirements like uppercase, numbers and symbols has been proven to be
ineffective. A longer, simpler, password is typically more secure than a short,
but harder to remember one. [xkcd](https://xkcd.com/936/) has a great comic on
this topic.

We use the [zxcvbn](https://github.com/zxcvbn-ts/zxcvbn) library to test the
strength of the password. This library is able to detect common patterns,
sequences and replacements (like "0" for "o", "1" for "l", etc.) and will score
the password against a large dictionary of common passwords, also enhanced with
contextual data like the user's name, email or date of birth.

We also test the password against the [Have I Been
Pwned](https://haveibeenpwned.com/) API to check if the password has ever been
found in a data breach.

Depending on the context, the results of these tests may simply be used to warn
the user, allowing them to proceed nonetheless (a user may decide to require a
passkey for example, and be satisfied with a weaker password), {{ todo }}or they
may be used to prevent the user from setting a password that doesn't meet the
minimum strength requirements.{{ /todo }}

### Password storage

We use Argon2id to hash the password and securely store it. Each password is
hashed with a unique salt, and the hash is stored in the database. The password
is never stored in plain text, and the hash is never sent to the client.

This effectively means that, in the unlikely event of a data breach, the
user accounts and passwords remain safe. Argon2id is currently considered the
state-of-the-art hashing algorithm, and is the winner of the [Password Hashing
Competition](https://password-hashing.net/).

### Multi-factor authentication and alternative authentication

We strongly encourage users to enable multi-factor authentication (MFA) on their
accounts. A second, or third factor of authentication provides an extra layer of
security, has proven effective against phishing and social engineering attacks.

We support:

- TOTP (time-based one-time passwords) codes. These codes are generated by an
  app on the user's device and are valid for a short period of time.
- {{ todo }}Push notifications. The user receives a notification on their device
  (mobile app or browser?) and must approve the sign-in attempt, confirming a
  number on screen. {{ /todo }}
- Passkeys. These are cryptographic keys that are stored on the user's device
  and are used to sign in to the account. Passkeys are more secure than
  passwords, and cannot be easily phished or stolen. They are also resistant
  to brute-force attacks, as they are not based on a shared secret. Passkeys
  come in different flavors, including some that are stored on dedicated
  tamper-resistant hardware with biometric unlock.
- {{ todo }}Account recovery passphrase. This is a sequence of words that the
  user can use to recover their account in case they lose access to all of
  their authentication factors, or as a bypass to a rate limit. This passphrase
  can also be split into shards and stored in different locations, or even
  shared with trusted friends or family members.{{ /todo }}

{{ todo }}We should encourage the user to set up a passkey or TOTP code as a
second factor of authentication right upon sign-up. This would also make up for
the non-enforcement of password strength at sign-up.{{ /todo }}

#### Non supported authentication methods

We do not support SMS or calls as a second factor of authentication. These
methods are inherently insecure and can be, and have been, easily compromised.
SMS messages can be intercepted. Calls can be spoofed.

We also do not support a "backup email" as a second factor of authentication.
This effectively delegates the security of the account to the security of the
backup email account. It completely breaks down the security model, as,
regardless of the attention and care we put into securing the noo account, we
cannot stop the user from using "password123" as a password for their backup
email account, and maybe without a second factor of authentication.

### Rate limits

Rate limits are a common way to slow down or prevent brute force attacks. Their
effectiveness may depend on the type of attack.

Rate limits can be applied on a per-IP basis, or on a per-user basis. Per-IP
rate limits are great at defending against a single machine attempting to brute
force one or more accounts, but they are not effective against a distributed
attack, where multiple machines cooperate to attempt to brute force a single
account.

Per-user rate limits are more effective against this type of attack, but they
may lock out legitimate users.

At the moment we are not considering to apply a generic rate limit solution to
the sign-in process. Per-IP limits can prevent users from signing in from Tor, a
VPN or even from home, if their ISP uses CGNAT. Per-user rate limits may
occasionaly prevent legitimate users from signing in, and be abused to that end.
{{ todo }}Enterprise accounts may be configured differently.{{ /todo }}

#### Protecting TOTP

Nonetheless, a rate limit solution is absolutely essential to protect the TOTP
authentication process. If a user password has been compromised, an attacker may
easily arrive at the TOTP screen, maybe even from multiple devices at the same
time, and, at that point, brute forcing the TOTP code becomes only a matter of
patience and luck. An attacker that can only make 10 attempts per second (we
expect attackers to be able to perform way more than that) may be able to
randomly guess the TOTP code in just over a day.

This is of course, unacceptable. Until we can determine a better solution, we
will implement a strict rate limit on the TOTP screen, allowing 3 attempts before
an exponential backoff is applied, up to a maximum of 15 minutes. This does
involve a risk of locking out legitimate users, but only in a scenario where
the main password has already been compromised.

{{ todo }}An user that receives this kind of attack, may be sent a notification
or email on devices where they have an active session and quickly change their
password, or add a passkey to their account.{{ /todo }}

{{ todo }}As of now, if an account is rate limited, only a Passkey can be used
to bypass the waiting time. As users are still getting used to passkeys, we may
have to support an alternative bypass type.{{ /todo }}

{{ todo }}We will also consider supporting 8-digit TOTP codes, which would
strengthen the security of the TOTP screen by 100x. This should be offered as an
advanced option, and not a default, as not all apps support it.{{ /todo }}

#### Bypassing a rate limit

We will always allow a user to sign in using a passkey, even if they are
currently rate limited on the TOTP screen.

{{ todo }}The user can also preventively set up a recovery passphrase, which
will allow them to bypass the TOTP screen in case of persistent rate limiting.
{{ /todo }}

### Honeypots

For less sophisticated, automated attacks on a large scale we employ a
honeypot field. A honeypot field is a visually hidden field that would be
invisible to a human user, but would be filled in by a script trying to
submit a form.

The field being filled in is a clear indication that the request is coming from
a bot, and we will immediately dismiss the request. This is a very low effort
measure, but has been proven effective over and over in many applications.

It is important to note that this is far from a fool-proof solution, simply
allowing us to quickly dismiss a large number of low effort attacks.

### Proof-of-Work

A solid alternative to rate limits is to require the client to perform a
computationally expensive task, like a Proof-of-Work (PoW) challenge. This is
typically implemented as requiring the client to find a nonce that, once
concatenanted with a challenge string, produces a hash that starts with a
certain number of leading zero bits. The number of leading zeroes required is
the _difficulty_ of the challenge. Every increment of difficulty doubles, on
average, the time it takes to find a valid nonce. A PoW challenge creates a
physical and economical barrier to a brute force attack, requiring to spend a
few seconds of 100% CPU time for each attempt, which translates to a few kWh of
electricity and eventually money on a bill.

This is typically implemented using the SHA256 hashing algorithm, and it's the
algorithm we use. The requirement to perform a PoW challenge is triggered after
a few failed password attempts, scoped to the IP address. This is particularly
effective, because, while a Tor exit node or a VPN may quickly end up restricted
and requiring a PoW challenge, a legitimate user will not have a problem with
one or two seconds of extra time to sign in.

With the growth of the cryptocurrency industry, specialized hardware has become
available to perform PoW challenges at a fraction of the cost of a regular CPU.
While a consumer CPU may be able to perform a few hundreds of thousands of
hashes per second, a specialized ASIC (worth around $3,000) may be able to
perform trillions of hashes per second. This means that we cannot be too harsh
or we risk making it impossible for a legitimate user to sign in, while still
being easy for an attacker with a few ASICs to perform the PoW challenge
relatively quickly. At some point WebGPU may become more [widely
available](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility),
slightly leveling the playing field, making it harder and harder for attackers
to have a significant edge over legitimate users.

{{ todo }}
We will have to monitor how quickly the PoW challenge is solved, on average,
and adjust the difficulty accordingly.

We are investigating implementing an Argon2 challenge, or, alternatively, to
delegate the hashing of the password to the client. Argon2 is a family of
hashing algorithms that have certain characteristics that make them hard to
parallelize or accelerate. This means that an attacker would have no significant
advantage over a legitimate user, even with specialized hardware.

Having the client perform the hashing of the password is not typically
recommended, as the server would not be able to re-test for password breaches,
so this should not the default option, and only kick in when a potential abuse
is detected.
{{ /todo }}
