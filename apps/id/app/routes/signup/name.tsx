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
  if (formData.get("favorite_color") !== "") {
    // This is a honeypot field. Only bots will fill it.
    return redirect("/signup/success");
  }

  const svc = new SignupService(formData);
  const errors = await svc.runStep1();

  if (errors) {
    const { makeT } = context.get(localeContext);
    const t = makeT("profile.name.errors");
    return {
      errors: translateErrors(t, errors),
      input: svc.params,
    };
  }

  return redirect("/signup/username", {
    headers: {
      "Set-Cookie": await signupData.serialize(svc.params),
    },
  });
}

export default function SignupPage() {
  const navigation = useNavigation();
  const isSubmitting = !!navigation.formAction;

  const t = useTranslations("signup");
  const profileT = useTranslations("profile");
  const commonT = useTranslations("common");

  const result = useActionData<typeof action>();

  return (
    <>
      <h2 className="text-xl text-center mb-8 font-extralight">
        {t("step1.title")}
      </h2>

      <Form method="POST" className="space-y-8">
        <TextField
          label={profileT("name.firstName")}
          name="first_name"
          defaultValue={result?.input.first_name}
          error={result?.errors.firstName}
          autoCapitalize="words"
        />

        <TextField
          label={profileT("name.lastName")}
          aroundLabel={(label) => (
            <div className="flex justify-between mb-1">
              {label}
              <span className="text-gray-500">{commonT("optional")}</span>
            </div>
          )}
          name="last_name"
          defaultValue={result?.input.last_name}
          error={result?.errors.lastName}
          autoCapitalize="words"
        />

        <div className="very-important-field">
          <label htmlFor="favorite_color">Favorite color</label>
          <input type="text" id="favorite_color" name="favorite_color" />
        </div>

        <div className="flex justify-end mt-12">
          <Button type="submit" pending={isSubmitting}>
            {commonT("next")}
          </Button>
        </div>
      </Form>
    </>
  );
}
