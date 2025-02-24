"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  first_name: z.string(),
  last_name: z.string(),
});

function isValidName(name: string) {
  const namePattern = /^[\p{L}\p{M}\p{Zs}.'-]+$/u;
  return namePattern.test(name);
}

export async function signupStep1(prevState: unknown, formData: FormData) {
  const data = schema.parse(Object.fromEntries(formData.entries()));

  data.first_name = data.first_name.trim();
  data.last_name = data.last_name.trim();

  // Validations

  // 1. first_name is required
  if (data.first_name === "") {
    return {
      errors: { first_name: "First name is required" },
      values: data,
    };
  }

  // 2. first_name + last_name must not exceed 50 characters
  if (data.first_name.length + data.last_name.length > 50) {
    return {
      errors: { first_name: "Name is too long" },
      values: data,
    };
  }

  // 3. first name + last name must be at least 3 characters
  if (data.first_name.length + data.last_name.length < 3) {
    return {
      errors: { first_name: "Name is too short" },
      values: data,
    };
  }

  // 4. Verify that the fields contain proper names (not emojis, numbers, etc.)
  if (!isValidName(data.first_name)) {
    return {
      errors: { first_name: "Invalid name" },
      values: data,
    };
  }

  if (data.last_name !== "" && !isValidName(data.last_name)) {
    return {
      errors: { last_name: "Invalid name" },
      values: data,
    };
  }

  redirect("/signup/username");
}
