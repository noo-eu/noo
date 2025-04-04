import { withAuth } from "@/auth/withAuth";
import { TimeZoneForm } from "@/screens/settings/time-zone/TimeZoneForm";

async function Page() {
  return <TimeZoneForm />;
}

export default withAuth(Page);
