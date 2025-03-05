import { PageModal } from "@/components/PageModal";

export default function SignupPage({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PageModal>{children}</PageModal>;
}
