import { useAuth } from "@/auth/authContext";
import { useTranslations } from "next-intl";
import Link from "next/link";

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
