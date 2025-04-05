import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  layout("./routes/signup/layout.tsx", [
    route("signup", "./routes/signup/name.tsx"),
    route("signup/username", "./routes/signup/username.tsx"),
    route("signup/password", "./routes/signup/password.tsx"),
    route("signup/terms", "./routes/signup/terms.tsx"),
  ]),

  route("signin", "./routes/signin.tsx"),
  route("signin/otp", "./routes/signin.otp.tsx"),

  ...prefix("private", [
    route("passwords/breaches", "./routes/private/passwords/breaches.tsx"),
    route("webauthn/start", "./routes/private/webauthn/start.tsx"),
    route("webauthn/verify", "./routes/private/webauthn/verify.tsx"),
    route(
      "webauthn/startRegistration",
      "./routes/private/webauthn/startRegistration.tsx",
    ),
    route("webauthn/register", "./routes/private/webauthn/register.tsx"),
  ]),

  index("./routes/user/home.tsx"),

  ...prefix("profile", [
    index("./routes/user/profile/home.tsx"),
    route("name", "./routes/user/profile/name.tsx"),
    route("birthdate", "./routes/user/profile/birthdate.tsx"),
    route("gender", "./routes/user/profile/gender.tsx"),
  ]),

  ...prefix("settings", [
    index("./routes/user/settings/home.tsx"),
    route("language", "./routes/user/settings/language.tsx"),
    route("time-zone", "./routes/user/settings/time-zone.tsx"),
  ]),

  ...prefix("security", [
    index("./routes/user/security/home.tsx"),
    route("password", "./routes/user/security/password.tsx"),
    route("passkeys", "./routes/user/security/passkeys.tsx"),
    route("sessions", "./routes/user/security/sessions.tsx"),
  ]),
];
