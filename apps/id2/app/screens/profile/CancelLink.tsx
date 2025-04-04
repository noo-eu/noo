import { useAuth } from "@/auth/authContext";
import Link from "next/link";
import { useTranslations } from "use-intl";

export function CancelLink(
  { section }: { section?: string } = { section: "profile" },
) {
  const commonT = useTranslations("common");
  const user = useAuth();

  return (
    <Link className="link p-2.5" href={`/${section}?uid=${user.id}`}>
      {commonT("cancel")}
    </Link>
  );
}
