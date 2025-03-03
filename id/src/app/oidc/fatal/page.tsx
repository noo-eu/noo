"use client";

import { useSearchParams } from "next/navigation";

export default function OidcFatalErrorPage() {
  const query = useSearchParams();

  return (
    <>
      <h1 className="text-xl font-medium mb-4">Something went wrong</h1>
      <p>
        You tried to sign in to a third-party application, but the application
        is not working correctly. Please try again later or contact the
        application owner with the following information:
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded-md my-4">
          OpenID Connect error: {query.get("error")}
        </pre>
      </p>
    </>
  );
}
