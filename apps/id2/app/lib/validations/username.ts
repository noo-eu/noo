const RESERVED_ANYWHERE = [
  // We can't disallow "noo" in usernames, as "noo" is used commonly in names,
  // but we can at least disallow some common variations.
  "n00",
  "no0",
  "n0o",

  "abuse",
  "admin",
  "announcement",
  "backup",
  "bounce",
  "contact",
  "customer",
  "donotreply",
  "donotrespond",
  "email",
  "master",
  "mailer",
  "daemon",
  "nobody",
  "noreply",
  "notification",
  "privacy",
  "system",
  "update",
  "webmail",
  "website",
  "whois",
];

const RESERVED_MATCH = [
  "accounting",
  "alerts",
  "announcements",
  "automailer",
  "autoresponder",
  "billing",
  "bulletin",
  "bulletins",
  "concierge",
  "courier",
  "delivery",
  "deploy",
  "developer",
  "developers",
  "dnsoperation",
  "ianatech",
  "listgroup",
  "listrequest",
  "listsender",
  "listserv",
  "localdomain",
  "localhost",
  "logwatch",
  "mailbox",
  "mailing",
  "maintenance",
  "marketing",
  "mediarelations",
  "mentions",
  "messages",
  "moderator",
  "newaccounts",
  "newbusiness",
  "newsbreak",
  "newsletter",
  "offers",
  "office",
  "operations",
  "operator",
  "owners",
  "payment",
  "payments",
  "pharmacy",
  "postbox",
  "postfix",
  "printer",
  "public",
  "purchasing",
  "refund",
  "register",
  "registrar",
  "registration",
  "salesorder",
  "security",
  "sendmail",
  "service",
  "support",
  "syslog",
  "tldops",
  "tldtech",
  "updates",
  "usenet",
  "wwwdata",
];

export function isUsernameAllowed(
  username: string,
  normalizedUsername: string,
): boolean {
  if (RESERVED_MATCH.includes(normalizedUsername)) {
    return false;
  }

  for (const reserved of RESERVED_ANYWHERE) {
    if (normalizedUsername.includes(reserved)) {
      return false;
    }
  }

  // Starting with "noo." is not allowed (but "noor" is fine)
  // Note: to be here, we know the username is at least 6 characters long
  if (username.toLocaleLowerCase().startsWith("noo")) {
    if (username[3] == ".") {
      return false;
    }
  }

  // Ending with "noo" is not allowed (jasonoo)
  if (username.toLocaleLowerCase().endsWith("noo")) {
    return false;
  }

  return true;
}
