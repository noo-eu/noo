import { ProfilePage } from "@/components/Profile";
import { withAuth } from "@/auth/withAuth";

async function Home() {
  return <ProfilePage />;
}

export default withAuth(Home);
