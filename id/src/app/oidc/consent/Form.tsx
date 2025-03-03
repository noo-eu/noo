"use client";

import { useActionState } from "react";
import { consentFormSubmit } from "./actions";
import { Button } from "@/components/Button";

export default function Form({ sessionId }: { sessionId: string }) {
  const [_, formAction, pending] = useActionState(consentFormSubmit, {});

  return (
    <div className="mt-8">
      <form action={formAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <div className="flex gap-4 justify-end">
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
        </div>
      </form>
    </div>
  );
}
