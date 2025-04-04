import { ProfileHeader } from "./ProfileHeader";

type Props = {
  children: React.ReactNode;
};

export default function ProfileLayout({ children }: Readonly<Props>) {
  return (
    <div className="flex flex-col items-center">
      <ProfileHeader />

      {children}
    </div>
  );
}
