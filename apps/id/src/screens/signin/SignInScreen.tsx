import { PageModal } from "@/components/PageModal";
import { SignInSidePanel } from "./SignInSidePanel";
import { getOidcAuthorizationRequest } from "@/lib/oidc/utils";
import { SignInForm } from "./SignInForm";
import { SignInWithNoo } from "@/components/SignInWithNoo";

export async function SignInScreen() {
  const oidcAuthorization = await getOidcAuthorizationRequest();

  return (
    <PageModal>
      {oidcAuthorization && <SignInWithNoo />}
      <PageModal.Modal>
        <SignInSidePanel />
        <div>
          <SignInForm />
        </div>
      </PageModal.Modal>
    </PageModal>
  );
}
