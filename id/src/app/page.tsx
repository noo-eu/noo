import { ProfilePage } from "@/components/Profile";
import { withAuth } from "@/lib/withAuth";

async function Home() {
  return <ProfilePage />;
}

export default withAuth(Home);
