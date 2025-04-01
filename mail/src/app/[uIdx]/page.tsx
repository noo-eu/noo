import { User } from "@/auth/authContext";
import { withAuth } from "@/auth/withAuth";

async function Page(props: { user: User }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-6">
      <h1 className="text-3xl font-bold">Welcome {props.user.firstName}</h1>
    </div>
  );
}

export default withAuth(Page);
