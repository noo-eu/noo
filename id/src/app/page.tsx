"use client";

import { signup } from "@/actions/signup";
import { useActionState } from "react";

const initialState = { message: "initial" };

export default function Home() {
  const [state, formAction, pending] = useActionState(signup, initialState);

  return (
    <div>
      <form action={formAction}>
        {pending && <span>Pending</span>}
        {state.message}
        <label>Name</label>
        <input type="text" name="name" />
        <input type="submit" />
      </form>
    </div>
  );
}
