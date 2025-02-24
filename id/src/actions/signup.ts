"use server";

import { redirect } from "next/navigation";

export async function signup(_: any, formData: FormData) {
  if (2 > 1) {
    return { message: "Please enter a valid email" };
  }

  redirect("/done");
}
