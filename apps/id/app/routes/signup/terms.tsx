import { uuidToHumanId } from "@noo/lib/humanIds";
import { Button, Noo } from "@noo/ui";
import {
  Form,
  redirect,
  useNavigation,
  type ActionFunctionArgs,
} from "react-router";
import { useTranslations } from "use-intl";
import { startSession } from "~/auth.server/success";
import { getOidcAuthorizationClient } from "~/lib.server/oidc";
import { signupData, SignupService } from "~/lib.server/SignupService";

export async function action({ request }: ActionFunctionArgs) {
  const data = await signupData.parse(request.headers.get("cookie"));
  if (!data) {
    return redirect("/signup", {
      headers: {
        "Set-Cookie": await signupData.serialize({}, { maxAge: 0 }),
      },
    });
  }

  const svc = new SignupService();
  const result = await svc.runStep4(data);

  if (result.success) {
    const cookies = await startSession(request, result.user);
    const userId = uuidToHumanId(result.user.id, "usr");

    const oidcAuthorization = await getOidcAuthorizationClient(request);
    let target = "/";
    if (oidcAuthorization) {
      target = `/oidc/consent?uid=${encodeURIComponent(userId)}`;
    }

    return redirect(target, {
      headers: cookies.map((cookie) => ["Set-Cookie", cookie]),
    });
  } else {
    return redirect("/signup", {
      headers: {
        "Set-Cookie": await signupData.serialize({}, { maxAge: 0 }),
      },
    });
  }
}

export default function SignupPage() {
  const navigation = useNavigation();
  const isSubmitting = !!navigation.formAction;

  const t = useTranslations("signup");

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step4.title")}
      </h2>

      <div className="text-sm">
        {t.rich("step4.description", {
          noo: () => <Noo />,
          p: (children) => <p className="mb-2">{children}</p>,
          terms: (children) => (
            <a href="/terms" target="_blank" className="text-blue-500">
              {children}
            </a>
          ),
          privacy: (children) => (
            <a href="/privacy" target="_blank" className="text-blue-500">
              {children}
            </a>
          ),
        })}
      </div>

      <Form method="POST" className="space-y-8">
        <div className="flex justify-end mt-12">
          <Button type="submit" pending={isSubmitting}>
            {t("step4.accept")}
          </Button>
        </div>
      </Form>
    </>
  );
}
