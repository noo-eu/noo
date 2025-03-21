import { getSessionUserById } from "@/auth/SessionsService";
import Users from "@/db/users";
import { BasicFormAction } from "@/lib/types/ActionResult";
import { redirect } from "next/navigation";
import { z } from "zod";

const updateBirthdateSchema = z.object({
  day: z.string(),
  month: z.string(),
  year: z.string(),
});

export async function updateBirthdate(
  uid: string,
  _: unknown,
  form: FormData,
): Promise<BasicFormAction> {
  const user = await getSessionUserById(uid);
  if (!user) {
    return redirect("/");
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

  const input = {
    day: day.toString(),
    month: month.toString(),
    year: year.toString(),
  };

  if (year < 1900) {
    return {
      input,
      error: { year: "bad_year" },
    };
  }

  if (month < 1 || month > 12) {
    return {
      input,
      error: { month: "invalid" },
    };
  }

  if (!isValidDate(day, month, year)) {
    return {
      input,
      error: { day: "invalid" },
    };
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date > new Date()) {
    return {
      input,
      error: { day: "future" },
    };
  }

  await Users.update(user.id, { birthdate: date });

  return { input };
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
