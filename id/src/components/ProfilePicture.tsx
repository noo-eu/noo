import Image from "next/image";

type ProfilePictureProps = {
  user: {
    picture: string | null;
    firstName: string;
  };
  className?: string;
  width: number;
};

export function ProfilePicture({
  user,
  className,
  width,
}: ProfilePictureProps) {
  if (user.picture) {
    return (
      <Image
        src={user.picture}
        alt=""
        className={`rounded-full aspect-square ${className}`}
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
