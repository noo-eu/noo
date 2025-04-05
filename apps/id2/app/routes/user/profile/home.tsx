import { emptyAuthLoader } from "~/auth/authLoader";
import ProfileHub from "~/screens/profile/Hub";

export const loader = emptyAuthLoader;

export default function Home() {
  return <ProfileHub />;
}
