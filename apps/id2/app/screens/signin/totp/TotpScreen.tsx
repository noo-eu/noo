import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { PageModal } from "~/components/PageModal";
import { SignInWithNoo } from "~/components/SignInWithNoo";
import { SignInSidePanel } from "../SignInSidePanel";
import { TotpForm } from "./TotpForm";

export async function TotpScreen({ hasPasskeys }: { hasPasskeys: boolean }) {
  const oidcAuthorization = await getOidcAuthorizationRequest();

  return (
    <PageModal>
      {oidcAuthorization && <SignInWithNoo />}
      <PageModal.Modal>
        <SignInSidePanel />
        <div>
          <TotpForm hasPasskeys={hasPasskeys} />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}
