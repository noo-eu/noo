import { PageModal } from "@/components/PageModal";
import { SignInSidePanel } from "../SignInSidePanel";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { TotpForm } from "./TotpForm";
import { SignInWithNoo } from "@/components/SignInWithNoo";

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
