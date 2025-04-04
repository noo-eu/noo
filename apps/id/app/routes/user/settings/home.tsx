import { emptyAuthLoader } from "~/auth.server/authLoader";
import { SettingsHub } from "~/screens/settings/Hub";

export const loader = emptyAuthLoader;

export default function Page() {
  return <SettingsHub />;
}
