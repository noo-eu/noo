import { emptyAuthLoader } from "~/auth.server/authLoader";
import ProfileHub from "~/screens/profile/Hub";

export const loader = emptyAuthLoader;

export default function Home() {
  return <ProfileHub />;
}
