"use server";

import Users from "@/db/users";
import { SessionsService } from "@/lib/SessionsService";
import { validateNameForm } from "@/lib/validations/name";
import { redirect } from "next/navigation";
import { z } from "zod";

const updateNameSchema = z.object({
  firstName: z.string(),
  lastName: z.string().nullable(),
});

type ErrorType = { [key: string]: string | undefined };

export type ActionResult<T, E, I> = { input: I } & (
  | {
      data: T;
      error?: never;
    }
  | {
      data?: never;
      error: E;
    }
);

export async function updateName(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<
  ActionResult<
    { success: boolean },
    ErrorType,
    z.infer<typeof updateNameSchema>
  >
> {
  const user = await SessionsService.userFor(uid);
  if (!user) {
    return redirect("/signin");
  }

  const data = updateNameSchema.parse(Object.fromEntries(form));
  const firstName = data.firstName.trim().replaceAll(/\s+/g, " ");
  const lastName = data.lastName?.trim().replaceAll(/\s+/g, " ") || "";

  const validationResult = validateNameForm(firstName, lastName);
  if (validationResult) {
    return { input: data, error: validationResult };
  }

  await Users.update(user.id, { firstName, lastName });

  return { data: { success: true }, input: data };
}

const updateBirthdateSchema = z.object({
  day: z.string(),
  month: z.string(),
  year: z.string(),
});

export type UpdateBirthdateState = ActionResult<
  { success: boolean },
  ErrorType,
  { day?: number; month?: number; year?: number }
>;

export async function updateBirthdate(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<UpdateBirthdateState> {
  const user = await SessionsService.userFor(uid);
  if (!user) {
    return redirect("/signin");
  }

  const data = updateBirthdateSchema.parse(Object.fromEntries(form));

  const day = parseInt(data.day);
  const month = parseInt(data.month);
  const year = parseInt(data.year);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    return {
      input: {},
      error: { day: "invalid" },
    };
  }

  if (year < 1900) {
    return {
      input: { day, month, year },
      error: { year: "bad_year" },
    };
  }

  if (month < 1 || month > 12) {
    return {
      input: { day, month, year },
      error: { month: "invalid" },
    };
  }

  if (!isValidDate(day, month, year)) {
    return {
      input: { day, month, year },
      error: { day: "invalid" },
    };
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date > new Date()) {
    return {
      input: { day, month, year },
      error: { day: "future" },
    };
  }

  await Users.update(user.id, { birthdate: date });

  return { data: { success: true }, input: { day, month, year } };
}

function isValidDate(day: number, month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  // Check if the date object contains the same values we provided If not, it
  // means `Date` adjusted the invalid date automatically
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

const updateGenderSchema = z.object({
  gender: z.enum(["male", "female", "custom", "not_specified"]),
  genderCustom: z.string().optional(),
  pronouns: z.enum(["male", "female", "other"]).optional(),
});

export async function updateGender(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<
  ActionResult<
    { success: boolean },
    ErrorType,
    z.infer<typeof updateGenderSchema>
  >
> {
  const user = await SessionsService.userFor(uid);
  if (!user) {
    return redirect("/signin");
  }

  const data = updateGenderSchema.parse(Object.fromEntries(form));
  if (data.gender == "male" || data.gender == "female") {
    await Users.update(user.id, {
      gender: data.gender,
      genderCustom: null,
      pronouns: data.gender,
    });
  } else if (data.gender == "custom") {
    await Users.update(user.id, {
      gender: "custom",
      genderCustom: data.genderCustom,
      pronouns: data.pronouns || "other",
    });
  } else {
    await Users.update(user.id, {
      gender: "not_specified",
      genderCustom: null,
      pronouns: "other",
    });
  }

  return { data: { success: true }, input: data };
}
