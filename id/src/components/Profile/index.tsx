"use client";

import { useState } from "react";
import { ProfilePicture } from "../ProfilePicture";
import { PictureDialog } from "./PictureDialog";

type ProfilePageProps = {
  session: {
    id: string;
    user: {
      firstName: string;
      lastName: string | null;
      picture: string | null;
    };
  };
};

export function ProfilePage({ session }: ProfilePageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center h-screen">
      <div className="mt-16 mb-8" onClick={() => setIsOpen(true)}>
        <ProfilePicture
          user={session.user}
          className="w-32 h-32 text-5xl"
          width={128}
        />
        <PictureDialog
          isOpen={isOpen}
          close={() => setIsOpen(false)}
          session={session}
        />
      </div>
      <h1 className="text-4xl font-medium mb-16">
        Welcome, {session.user.firstName}!
      </h1>
    </div>
  );
}
