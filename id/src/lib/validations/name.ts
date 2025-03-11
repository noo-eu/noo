import { isValidName } from "../name";

export function validateNameForm(
  firstName: string,
  lastName: string,
): Record<string, string> | undefined {
  const first = firstName.trim().replaceAll(/\s+/g, " ");
  const last = lastName?.trim().replaceAll(/\s+/g, " ");

  if (!first) {
    return { firstName: "required" };
  }

  if (first.length + last.length > 50) {
    return { firstName: "tooLong" };
  }

  if (first.length + last.length < 3) {
    return { firstName: "tooShort" };
  }

  if (!isValidName(first)) {
    return { firstName: "invalid" };
  }

  if (!isValidName(last)) {
    return { lastName: "invalid" };
  }
}
