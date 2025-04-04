import * as Sentry from "@sentry/react-router";

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import { IntlProvider } from "use-intl";
import type { Route } from "./+types/root";
import css from "./app.css?url";
import { useNonce } from "./lib/NonceProvider";
import { getMessages, resolveLocale } from "./utils";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://static.noo.eu" },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const locale = await resolveLocale(request, params);

  return {
    locale,
    messages: await getMessages(locale),
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const cspNonce = useNonce();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <link rel="stylesheet" href={css} nonce={cspNonce} />
        <link rel="manifest" href="https://static.noo.eu/site.webmanifest" />
        <meta
          property="og:image"
          content="https://static.noo.eu/noo-cover.png"
        />
        <link rel="icon" href="https://static.noo.eu/favicon.ico" />
        <link
          rel="icon"
          href="https://static.noo.eu/favicon.svg"
          type="image/svg+xml"
        />
        <link
          rel="icon"
          href="https://static.noo.eu/favicon-96x96.png"
          type="image/png"
          sizes="96x96"
        />
        <link
          rel="apple-touch-icon"
          href="https://static.noo.eu/apple-touch-icon.png"
          type="image/png"
          sizes="180x180"
        />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={cspNonce} />
        <Scripts nonce={cspNonce} />
      </body>
    </html>
  );
}

export default function App() {
  const { locale, messages } = useLoaderData<typeof loader>();

  return (
    <IntlProvider locale={locale} messages={messages}>
      <Outlet />
    </IntlProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    // you only want to capture non 404-errors that reach the boundary
    Sentry.captureException(error);
    if (import.meta.env.DEV) {
      details = error.message;
      stack = error.stack;
    }
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
