import { PasskeysPageForm } from "./Form";

export default async function PasskeysPage({
  searchParams,
}: {
  searchParams: Promise<{ uid?: string }>;
}) {
  const uid = (await searchParams).uid!;

  return <PasskeysPageForm uid={uid} />;
}
