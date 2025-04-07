import { Button, TextField } from "@noo/ui";
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
  const errors = await svc.runStep2();

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

  return redirect("/signup/password", {
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

  const result = useActionData<typeof action>();

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step2.title")}
      </h2>

      <Form method="POST" className="space-y-8">
        <TextField
          label={t("step2.username")}
          name="username"
          defaultValue={result?.input.username}
          error={result?.errors.username}
          suffix={`@${import.meta.env.NONSECRET_PUBLIC_MAIL_DOMAIN}`}
          autoComplete="username"
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
