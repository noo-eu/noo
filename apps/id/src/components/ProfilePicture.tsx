"use client";

import { useAuth } from "@/auth/authContext";
import Image from "@/components/Image";

export type ProfilePictureProps = {
  className?: string;
  width: number;
};

export function ProfilePicture({
  className,
  width,
}: Readonly<ProfilePictureProps>) {
  const user = useAuth();

  if (user.picture) {
    return (
      <Image
        src={user.picture}
        alt=""
        className={`rounded-full aspect-square select-none ${className}`}
        width={width}
        height={width}
      />
    );
  }

  return (
    <div
      className={`${className} aspect-square bg-gray-500 dark:bg-gray-700 text-white rounded-full flex items-center justify-center select-none tracking-widest`}
    >
      <span>{user.firstName[0].toUpperCase()}</span>
    </div>
  );
}
