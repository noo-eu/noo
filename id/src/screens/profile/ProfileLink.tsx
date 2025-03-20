import { useAuth } from "@/auth/authContext";
import Link from "next/link";

export function ProfileLink({
  href,
  Icon,
  title,
  value,
  children,
}: {
  href: string;
  Icon: React.ComponentType<{ className: string }>;
  title: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { id: userId } = useAuth();

  return (
    <Link
      className="dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2 relative"
      href={`${href}?uid=${userId}`}
    >
      <Icon className="size-6 self-start mt-0.5" />
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        {value || children}
      </div>
    </Link>
  );
}
