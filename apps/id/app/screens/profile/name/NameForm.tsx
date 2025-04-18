import { Button, TextField } from "@noo/ui";
import { Noo } from "@noo/ui/Noo";
import { useFetcher } from "react-router";
import { useTranslations } from "use-intl";
import { capitalizeName } from "~/lib.server/name";
import { CancelLink } from "../CancelLink";
import { ProfileFormLayout } from "../ProfileFormLayout";
import { useNameForm } from "./useNameForm";

export function NameForm() {
  const fetcher = useFetcher();

  const {
    errors,
    onSubmit,
    form: { firstName, setFirstName, lastName, setLastName },
  } = useNameForm(fetcher);

  const t = useTranslations("profile.name");
  const commonT = useTranslations("common");

  return (
    <ProfileFormLayout>
      <h2 className="text-2xl mb-4">{t("title")}</h2>

      <p className="mb-4 text-sm">
        {t.rich("description", {
          noo: () => <Noo />,
        })}
      </p>

      <fetcher.Form
        method="POST"
        onSubmit={onSubmit}
        className="space-y-8"
        data-testid="form"
      >
        <TextField
          label={t("firstName")}
          name="firstName"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
          }}
          onBlur={(e) => {
            setFirstName(capitalizeName(e.target.value));
          }}
          error={errors?.firstName && t(`errors.${errors.firstName}`)}
          focusOnLoad
        />
        <TextField
          label={t("lastName")}
          name="lastName"
          value={lastName ?? ""}
          onChange={(e) => {
            setLastName(e.target.value);
          }}
          onBlur={(e) => {
            setLastName(capitalizeName(e.target.value));
          }}
          error={errors?.lastName && t(`errors.${errors.lastName}`)}
        />

        <p className="text-sm">
          {t.rich("updateNotice", {
            noo: () => <Noo />,
          })}
        </p>

        <div className="flex gap-4 justify-end items-center">
          <CancelLink />
          <Button type="submit" pending={fetcher.state !== "idle"}>
            {commonT("save")}
          </Button>
        </div>
      </fetcher.Form>
    </ProfileFormLayout>
  );
}
