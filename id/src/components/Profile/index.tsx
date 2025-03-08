"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ProfilePicture } from "../ProfilePicture";
import { User } from "@/db/users";
import Link from "next/link";
import {
  Cog6ToothIcon,
  LockClosedIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export type ProfilePageProps = {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    picture: string | null;
    birthdate: Date | null;
    gender: User["gender"];
    genderCustom: string | null;
    pronouns: User["pronouns"];
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

      <div className="space-y-4 w-full max-w-lg p-4">
        <Link
          className="dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href="/profile"
        >
          <UserCircleIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">Your profile</h2>

            <p>Check your profile and update your information</p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href="/security"
        >
          <LockClosedIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">Privacy & Security</h2>

            <p>Manage your privacy settings and account security</p>
          </div>
        </Link>
        <Link
          className="dark:bg-white/5 bg-black/10 hover:bg-black/20 dark:hover:bg-white/15 block border border-black/15 dark:border-white/20 w-full p-4 rounded-md flex items-center gap-2"
          href="/settings"
        >
          <Cog6ToothIcon className="size-6 self-start mt-0.5" />
          <div>
            <h2 className="text-lg font-medium">Settings</h2>

            <p>Customize your experience and preferences</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
