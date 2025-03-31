export type AccountBoxProps = {
  user: {
    name: string;
    email?: string;
    tenant?: string;
  };
};

export function AccountBox({ user }: Readonly<AccountBoxProps>) {
  return (
    <div className="flex items-center">
      <div className="me-4">
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-lg select-none">
          {user.name[0].toUpperCase()}
        </div>
      </div>
      <div className="text-sm">
        <div className="font-semibold">{user.name}</div>
        <div className="text-gray-400">{user.email ?? user.tenant}</div>
      </div>
    </div>
  );
}
