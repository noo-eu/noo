import type { ClientUser } from "~/types/ClientUser.client";

export type AccountBoxProps = {
  user: ClientUser;
};

export function AccountBox({ user }: Readonly<AccountBoxProps>) {
  return (
    <div className="flex items-center">
      <div className="me-4">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg select-none">
          {user.firstName[0].toUpperCase()}
        </div>
      </div>
      <div className="text-sm">
        <div className="font-semibold">{user.firstName}</div>
        <div className="text-gray-400">{user.email ?? user.tenant}</div>
      </div>
    </div>
  );
}
