import { emptyAuthLoader } from "~/auth.server/authLoader";
import { ProfilePage } from "~/screens/home";

export const loader = emptyAuthLoader;

export default function Home() {
  return <ProfilePage />;
}
