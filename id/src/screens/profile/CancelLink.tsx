import { useAuth } from "@/auth/authContext";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function CancelLink() {
  const commonT = useTranslations("common");
  const user = useAuth();

  return (
    <Link className="link p-2.5" href={`/profile?uid=${user.id}`}>
      {commonT("cancel")}
    </Link>
  );
}
