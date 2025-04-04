import { sha1 } from "@noo/lib/crypto";
import { err, ok, type Result } from "neverthrow";
import type { User } from "~/db.server/users.server";
import Users from "~/db.server/users.server";

const PASSWORD_BREACH_CHECK_INTERVAL = 1000 * 60 * 60 * 24 * 7; // 1 week

export async function maybeCheckPwnedPassword(
  user: User,
  password: string,
  interval: number = PASSWORD_BREACH_CHECK_INTERVAL,
) {
  if (
    !user.passwordBreachesCheckedAt ||
    user.passwordBreachesCheckedAt < new Date(Date.now() - interval)
  ) {
    if (user.passwordBreaches > 0) {
      // No need to check again, we know the password is breached
      await Users.update(user.id, { passwordBreachesCheckedAt: new Date() });
    } else {
      const breaches = await checkPwnedPassword(password);
      if (breaches.isOk() && breaches.value > 0) {
        await Users.update(user.id, {
          passwordBreaches: breaches.value,
          passwordBreachesCheckedAt: new Date(),
        });
      }
    }
  }
}

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
