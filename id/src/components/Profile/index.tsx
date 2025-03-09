"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ProfilePicture } from "../ProfilePicture";

type ProfilePageProps = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    picture: string | null;
  };
};

const PictureDialog = dynamic(() => import("./PictureDialog"), {
  ssr: false,
});

export function ProfilePage({ user }: ProfilePageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center">
      <div className="mt-16 mb-8" onClick={() => setIsOpen(true)}>
        <div className="flex items-center justify-center border border-2 rounded-full p-0.75">
          <ProfilePicture
            user={user}
            className="w-32 h-32 text-5xl cursor-pointer hover:opacity-80"
            width={128}
          />
        </div>
        <PictureDialog
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          user={user}
        />
      </div>
      <h1 className="text-4xl font-medium mb-16">Welcome, {user.firstName}!</h1>
    </div>
  );
}
