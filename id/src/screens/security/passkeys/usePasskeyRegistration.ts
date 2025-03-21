import {
  registrationOptions,
  verifyRegistration,
} from "@/app/security/passkeys/actions";
import { useAuth } from "@/auth/authContext";
import {
  PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";

export function usePasskeyRegistration() {
  const { id: userId } = useAuth();

  return async function register() {
    const options = await registrationOptions(userId);
    if (options.error) {
      console.error("Error registering passkey:", options.error);
      return;
    }

    try {
      const registrationResponse = await startRegistration({
        optionsJSON: options.data as PublicKeyCredentialCreationOptionsJSON,
      });
      return await verifyRegistration(userId, registrationResponse);
    } catch (error) {
      console.error("Error registering passkey:", error);
    }
  };
}
