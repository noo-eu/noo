"use client";

import { Button } from "@noo/ui";
import { startRegistration } from "@simplewebauthn/browser";
import { registrationOptions } from "./actions";

function optionsIsError(options: unknown): options is { error: string } {
  return "error" in options;
}

export function PasskeysPageForm({ uid }: { uid: string }) {
  const registerPasskey = async () => {
    const options = await registrationOptions(uid);
    if (optionsIsError(options)) {
      console.error("Error generating registration options:", options.error);
      return;
    }

    const attResp = await startRegistration({ optionsJSON: options });
    console.log("Registration response:", attResp);
  };

  return (
    <div>
      <Button onClick={registerPasskey}>Register</Button>
    </div>
  );
}
