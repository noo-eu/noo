import { Link } from "react-router";
import { useAuth } from "~/auth.server/context";

type Props = {
  href: string;
  Icon: React.ComponentType<{ className: string }>;
  title: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
};

export function ProfileLink({
  href,
  Icon,
  title,
  value,
  children,
}: Readonly<Props>) {
  const { id: userId } = useAuth();

  return (
    <Link
      className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2 relative"
      to={`${href}?uid=${userId}`}
      data-testid={`profile-link-${href}`}
    >
      <Icon className="size-6 self-start mt-0.5" />
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        {value || children}
      </div>
    </Link>
  );
}
