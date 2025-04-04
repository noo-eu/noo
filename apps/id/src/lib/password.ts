import { sha1 } from "@/utils";
import { err, ok, Result } from "neverthrow";

export async function checkPwnedPassword(
  password: string,
): Promise<Result<number, string>> {
  const hash = sha1(password.trim()).digest("hex").toUpperCase();

  const [prefix, suffix] = [hash.slice(0, 5), hash.slice(5)];

  try {
    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "Add-Padding": "true",
        },
        signal: AbortSignal.timeout(1000),
      },
    );

    if (!response.ok) {
      return err("Failed to check password against Pwned Passwords database");
    }

    const lines = (await response.text()).split("\n");
    for (const line of lines) {
      const [hashSuffix, count] = line.split(":");
      if (hashSuffix === suffix) {
        return ok(parseInt(count, 10));
      }
    }
  } catch (e) {
    return err(
      `Failed to check password against Pwned Passwords database: ${e}`,
    );
  }

  return ok(0);
}
