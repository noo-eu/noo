import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { useAuth } from "~/auth.server/context";

export function CancelLink({ section = "profile" }: { section?: string }) {
  const commonT = useTranslations("common");
  const user = useAuth();

  return (
    <Link
      className="link p-2.5"
      to={`/${section}?uid=${encodeURIComponent(user.id)}`}
    >
      {commonT("cancel")}
    </Link>
  );
}
