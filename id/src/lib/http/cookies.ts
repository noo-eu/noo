export function getCookies(headers: Headers): Record<string, string> {
  const cookieHeader = headers.get("Cookie");
  if (!cookieHeader) {
    return {};
  }

  return (
    cookieHeader.split(";").reduce(
      (cookies, cookie) => {
        const [name, ...value] = cookie.split("=");
        if (name === undefined) {
          // Invalid cookie header, return early with the current state
          return cookies;
        }
        cookies[name.trim()] = value.join("=");
        return cookies;
      },
      {} as Record<string, string>,
    ) ?? {}
  );
}
