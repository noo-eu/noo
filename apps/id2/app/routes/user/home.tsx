import { emptyAuthLoader } from "~/auth/authLoader";
import { ProfilePage } from "~/screens/home";

export const loader = emptyAuthLoader;

export default function Home() {
  return <ProfilePage />;
}
