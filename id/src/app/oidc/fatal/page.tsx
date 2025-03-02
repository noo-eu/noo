"use client";

import { Noo } from "@/components/Noo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function OidcFatalErrorPage() {
  const query = useSearchParams();

  return (
    <div className="sm:flex flex-col justify-center min-h-screen dark:bg-black/40 dark:sm:bg-transparent">
      <div className="sm:my-16 flex flex-col justify-center items-center min-h-screen sm:block sm:min-h-auto">
        <div className="text-3xl sm:mb-4 w-auto mx-auto max-w-lg">
          <Noo />
        </div>

        <div className="px-4 sm:px-12 py-10 w-full sm:max-w-lg sm:mx-auto sm:rounded-lg sm:shadow-lg sm:backdrop-blur-xs sm:bg-white/40 dark:sm:bg-white/20">
          <h1 className="text-xl font-medium mb-4">Something went wrong</h1>
          <p>
            You tried to sign in to a third-party application, but the
            application is not working correctly. Please try again later or
            contact the application owner with the following information:
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-4">
              OpenID Connect error: {query.get("error")}
            </pre>
          </p>
        </div>

        <div className="w-full sm:max-w-lg sm:mx-auto flex space-x-4 my-4 px-4 sm:px-0">
          <Link
            href="/"
            className="text-xs sm:hover:bg-blue-200 sm:dark:hover:bg-white/20 sm:p-2.5 rounded-md"
          >
            Go to your <Noo /> home
          </Link>
        </div>
      </div>
    </div>
  );
}
