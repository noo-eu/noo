"use client";

import { useActionState } from "react";
import { signupStep1 } from "./action";

type State = {
  values: {
    first_name: string;
    last_name: string;
  };
  errors: {
    first_name?: string;
    last_name?: string;
  };
};

const initialState: State = {
  values: {
    first_name: "",
    last_name: "",
  },
  errors: {},
};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    signupStep1,
    initialState,
  );

  return (
    <div className="max-w-sm mx-auto p-4">
      <h1 className="text-center">Create a noo account</h1>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="first_name"
            className="mb-2 block text-sm/6 font-medium text-gray-900"
          >
            First name
          </label>
          <input
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-eu-blue sm:text-sm/6"
            type="text"
            name="first_name"
            id="first_name"
            required
            defaultValue={state.values.first_name}
          />
          {state.errors.first_name && (
            <p className="text-sm/6 text-red-600">{state.errors.first_name}</p>
          )}
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <label
              htmlFor="last_name"
              className="block text-sm/6 font-medium text-gray-900"
            >
              Surname
            </label>
            <span className="text-sm/6 text-gray-500" id="email-optional">
              Optional
            </span>
          </div>
          <input
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-eu-blue sm:text-sm/6"
            type="text"
            name="last_name"
            id="last_name"
            defaultValue={state.values.last_name}
          />
          {state.errors.last_name && (
            <p className="text-sm/6 text-red-600">{state.errors.last_name}</p>
          )}
        </div>

        <div className="flex justify-end">
          <input
            className="cursor-pointer rounded-md bg-eu-blue px-3.5 py-2.5 font-semibold text-white shadow-xs hover:bg-eu-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eu-blue"
            type="submit"
            value="Next"
          />
        </div>
      </form>
    </div>
  );
}
