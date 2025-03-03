"use client";

import { useActionState } from "react";
import { consentFormSubmit } from "./actions";
import { Button } from "@/components/Button";

export default function Form() {
  const [state, formAction, pending] = useActionState(consentFormSubmit, {});

  return (
    <div>
      <form action={formAction}>
        <Button
          type="submit"
          name="consent"
          disabled={pending}
          value={"no"}
          kind="secondary"
        >
          Cancel
        </Button>
        <Button type="submit" name="consent" disabled={pending} value={"yes"}>
          Continue
        </Button>
      </form>
    </div>
  );
}
