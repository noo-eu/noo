import {
  type PublicKeyCredentialCreationOptionsJSON,
  type RegistrationResponseJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useAuth } from "~/auth.server/context";

async function registrationOptions(userId: string) {
  const response = await fetch(
    `/private/webauthn/startRegistration?uid=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
      }),
    },
  );
  const { data } = await response.json();
  if (!response.ok) {
    return {
      error: data.error,
    };
  }
  return data as PublicKeyCredentialCreationOptionsJSON;
}

async function verifyRegistration(
  userId: string,
  registrationResponse: RegistrationResponseJSON,
) {
  const response = await fetch(
    `/private/webauthn/register?uid=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registrationResponse,
      }),
    },
  );
  const data = await response.json();
  if (!response.ok) {
    return {
      error: data.error,
    };
  }
  return data;
}

export function usePasskeyRegistration() {
  const { id: userId } = useAuth();

  return async function register() {
    const options = await registrationOptions(userId);
    if ("error" in options) {
      console.error("Error registering passkey:", options.error);
      return false;
    }

    try {
      const registrationResponse = await startRegistration({
        optionsJSON: options as PublicKeyCredentialCreationOptionsJSON,
      });
      const verificationResponse = await verifyRegistration(
        userId,
        registrationResponse,
      );
      if (verificationResponse.error) {
        console.error(
          "Error verifying passkey registration:",
          verificationResponse.error,
        );
        return false;
      }
    } catch (error) {
      console.error("Error registering passkey:", error);
      return false;
    }

    return true;
  };
}
