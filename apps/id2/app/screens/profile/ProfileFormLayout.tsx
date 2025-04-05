import { PageModal } from "~/components/PageModal";
import ProfileLayout from "../home/ProfileLayout";
import { ProfileFormHeader } from "./ProfileFormHeader";

export function ProfileFormLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProfileLayout>
      <PageModal footer={false} className="!max-w-xl w-full p-4 mx-auto">
        <ProfileFormHeader />
        <PageModal.Modal className="!block">{children}</PageModal.Modal>
      </PageModal>
    </ProfileLayout>
  );
}
