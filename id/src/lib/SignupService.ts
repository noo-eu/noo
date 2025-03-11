import Users, { User } from "@/db/users";
import argon2 from "argon2";
import { z } from "zod";
import { validateNameForm } from "./validations/name";
import { isUsernameAllowed } from "./validations/username";

const step1Schema = z.object({
  first_name: z.string(),
  last_name: z.string(),
});

const step2Schema = z.object({
  username: z.string(),
});

const step3Schema = z.object({
  password: z.string(),
});

const finalSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type Step4Result =
  | {
      success: true;
      user: User;
    }
  | {
      success: false;
      errors: Record<string, string>;
    };

export class SignupService {
  private readonly formData: FormData;
  public params: Record<string, string> = {};

  constructor(formData: FormData = new FormData()) {
    this.formData = formData;
  }

  get data() {
    return Object.fromEntries(this.formData.entries());
  }

  async runStep1() {
    const data = trim(step1Schema.parse(this.data));
    this.params = data;
    return validateStep1(data);
  }

  async runStep2() {
    const data = trim(step2Schema.parse(this.data));
    this.params = data;
    return validateStep2(data);
  }

  async runStep3() {
    const data = trim(step3Schema.parse(this.data));
    this.params = data;
    return validateStep3(data);
  }

  async runStep4(data: Record<string, string>): Promise<Step4Result> {
    // Validate the schema
    const parsed = finalSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, errors: { form: "invalid_data" } };
    }

    let errors = await validateStep1(parsed.data);
    if (errors) return { success: false, errors };

    errors = await validateStep2(parsed.data);
    if (errors) return { success: false, errors };

    errors = await validateStep3(parsed.data);
    if (errors) return { success: false, errors };

    return {
      success: true,
      user: await Users.create({
        username: parsed.data.username,
        normalizedUsername: parsed.data.username
          .toLowerCase()
          .replace(/\./g, ""),
        passwordDigest: await hashPassword(parsed.data.password),
        passwordChangedAt: new Date(),
        firstName: parsed.data.first_name,
        lastName: parsed.data.last_name,
      }),
    };
  }
}

async function validateStep1(
  data: z.infer<typeof step1Schema>,
): Promise<Record<string, string> | undefined> {
  return validateNameForm(data.first_name, data.last_name);
}

async function validateStep2(
  data: z.infer<typeof step2Schema>,
): Promise<Record<string, string> | undefined> {
  // 1. username is required
  if (data.username == "" || !data.username) {
    return { username: "username_required" };
  }

  // 2. username must start and end with a letter or number
  if (!/^[a-z0-9]/i.test(data.username)) {
    return { username: "username_first_char" };
  } else if (!/[a-z0-9]$/i.test(data.username)) {
    return { username: "username_last_char" };
  }

  // 3. username can only contain letters, numbers and dots
  const usernamePattern = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/i;
  if (!usernamePattern.test(data.username)) {
    return { username: "username_invalid" };
  }

  // 4. username cannot have two dots
  if (data.username.includes("..")) {
    return { username: "username_two_dots" };
  }

  // Usernames are normalized and in lowercase and without dots (preserving the original for display)
  const normalizedUsername = data.username.toLowerCase().replace(/\./g, "");

  // 5. The normalized username must be between 6 and 30 characters
  if (normalizedUsername.length < 6 || normalizedUsername.length > 30) {
    return { username: "username_length" };
  }

  // 6. Normalized usernames must be unique
  const available = await Users.isUsernameAvailable(normalizedUsername, null);
  if (!available) {
    return { username: "username_taken" };
  }

  // 7. The username must not be in the list of reserved usernames
  const allowed = isUsernameAllowed(data.username, normalizedUsername);
  if (!allowed) {
    return { username: "username_reserved" };
  }
}

async function validateStep3(
  data: z.infer<typeof step3Schema>,
): Promise<Record<string, string> | undefined> {
  // 1. password is required
  if (data.password == "" || !data.password) {
    return { password: "password_required" };
  }

  // 2. password must be at least 10 characters
  if (data.password.length < 10) {
    return { password: "password_length" };
  }

  // 3. password must not exceed 200 characters: this avoids DoS attacks with
  //    megabyte-long passwords to hash with an already slow algorithm
  if (data.password.length > 200) {
    return { password: "password_too_long" };
  }

  // 4. password must contain at least 2 classes of characters
  const classes = {
    lowercase: /[a-z]/u,
    uppercase: /[A-Z]/,
    digits: /\d/,
    special: /[^a-zA-Z\d]/,
  };

  let classCount = 0;
  for (const [_, pattern] of Object.entries(classes)) {
    if (pattern.test(data.password)) {
      classCount++;
    }
  }

  if (classCount < 2) {
    return { password: "password_classes" };
  }
}

export function hashPassword(password: string) {
  return argon2.hash(password);
}

function trim<T extends Record<string, string>>(data: T): T {
  const trimmed: Record<string, string> = {};
  for (const key in data) {
    trimmed[key] = data[key].trim();
  }
  return trimmed as T;
}
