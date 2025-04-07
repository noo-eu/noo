import { Button, PasswordField } from "@noo/ui";
import {
  Form,
  redirect,
  useActionData,
  useNavigation,
  type ActionFunctionArgs,
} from "react-router";
import { useTranslations } from "use-intl";
import {
  signupData,
  SignupService,
  translateErrors,
} from "~/lib.server/SignupService";
import { localeContext } from "~/root";

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();

  const svc = new SignupService(formData);
  const errors = await svc.runStep3();

  if (errors) {
    const { makeT } = context.get(localeContext);
    const t = makeT("signup.errors");
    return {
      errors: translateErrors(t, errors),
      input: svc.params,
    };
  }

  const data = {
    ...(await signupData.parse(request.headers.get("cookie"))),
    ...svc.params,
  };

  return redirect("/signup/terms", {
    headers: {
      "Set-Cookie": await signupData.serialize(data),
    },
  });
}

export default function SignupPage() {
  const navigation = useNavigation();
  const isSubmitting = !!navigation.formAction;

  const t = useTranslations("signup");
  const commonT = useTranslations("common");
  const passwordT = useTranslations("common.passwordField");

  const result = useActionData<typeof action>();

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step3.title")}
      </h2>

      <Form method="POST" className="space-y-8">
        <PasswordField
          label={t("step3.password")}
          name="password"
          defaultValue={result?.input.password}
          error={result?.errors.password}
          autoComplete="new-password"
          t={passwordT}
          focusOnLoad
        />

        <div className="flex justify-end mt-12">
          <Button type="submit" pending={isSubmitting}>
            {commonT("next")}
          </Button>
        </div>
      </Form>
    </>
  );
}
