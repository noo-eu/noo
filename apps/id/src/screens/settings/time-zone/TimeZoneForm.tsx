"use client";

import { Button, SelectField } from "@noo/ui";
import { useTranslations } from "next-intl";
import { useAuth } from "@/auth/authContext";
import { ProfileFormLayout } from "@/screens/profile/ProfileFormLayout";
import { useTimeZoneForm } from "./useTimeZoneForm";
import { updateTimeZone } from "@/app/settings/time-zone/actions";
import { CancelLink } from "@/screens/profile/CancelLink";
import { displayTz, getNormalizedTimeZone, getSelect } from "@/lib/timeZones";

const useDetectedTimeZone = () => {
  return getNormalizedTimeZone(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
};

export function TimeZoneForm() {
  const user = useAuth();

  const { state, formAction, isPending } = useTimeZoneForm(
    updateTimeZone.bind(null, user.id),
  );

  const t = useTranslations("settings.timeZone");
  const commonT = useTranslations("common");

  const timeZonesByContinent = getSelect();

  const browserTz = useDetectedTimeZone();
  const detected = displayTz(t, browserTz);

  return (
    <ProfileFormLayout>
      <h1 className="text-2xl mb-4">{t("title")}</h1>

      <p className="text-sm my-6">{t("description")}</p>
      <p className="text-sm my-6">{t("detected", { detected })}</p>

      <form
        action={formAction}
        className="space-y-8"
        data-testid="timeZone-form"
      >
        <SelectField
          label={t("label")}
          name="timeZone"
          defaultValue={state.input.timeZone}
          labelProps={{ className: "!sr-only" }}
        >
          <option value="GMT">{t("gmt")}</option>
          <option value="CET">{t("cet")}</option>
          <option value="EET">{t("eet")}</option>
          {Object.entries(timeZonesByContinent).map(([continent, zones]) => (
            <optgroup key={continent} label={continent}>
              {zones.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </optgroup>
          ))}
        </SelectField>
        <div className="flex gap-4 justify-end items-center">
          <CancelLink section="settings" />
          <Button type="submit" pending={isPending}>
            {commonT("save")}
          </Button>
        </div>
      </form>
    </ProfileFormLayout>
  );
}
