import * as Sentry from "@sentry/react-router";

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  unstable_createContext,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import { createTranslator, IntlProvider } from "use-intl";
import type { Route } from "./+types/root";
import css from "./app.css?url";
import { useNonce } from "./lib.server/NonceProvider";
import { getMessages, resolveLocale } from "./utils";

import { ToastContainer } from "react-toastify/unstyled";
import { Footer } from "~/components/Footer";
import { AuthProvider } from "./auth.server/context";
import { userContext } from "./auth.server/serverContext";
import { getAuthenticatedUser } from "./auth.server/sessions";
import type { User } from "./db.server/users.server";
import { makeClientUser } from "./types/ClientUser";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://static.noo.eu" },
];

async function loadUser({ request, context }: LoaderFunctionArgs) {
  let user: User | undefined;
  const uid = new URL(request.url).searchParams.get("uid");
  if (uid) {
    user = await getAuthenticatedUser(request, uid);
  }

  context.set(userContext, user);
  return user;
}

export async function loader({ context }: LoaderFunctionArgs) {
  const localeCtx = context.get(localeContext);
  const user = context.get(userContext);

  return {
    locale: localeCtx.locale,
    rawLocale: localeCtx.rawLocale,
    messages: await getMessages(localeCtx.locale),
    user: user ? makeClientUser(user) : undefined,
  };
}

export const localeContext = unstable_createContext<{
  locale: string;
  rawLocale: string;
  makeT: (ns: string) => ReturnType<typeof createTranslator>;
}>();

const localeSetter: Route.unstable_MiddlewareFunction = async (
  { request, context },
  next,
) => {
  const user = context.get(userContext);

  const { locale, rawLocale } = await resolveLocale(user, request);

  const messages = await getMessages(locale);
  const makeT = (namespace: string) =>
    createTranslator({ namespace, locale, messages });

  context.set(localeContext, {
    locale,
    rawLocale,
    // @ts-expect-error use-intl types are possibly wrong
    makeT,
  });

  return await next();
};

export const unstable_middleware = [loadUser, localeSetter];

export function Layout({ children }: { children: React.ReactNode }) {
  const cspNonce = useNonce();
  const loaderData = useLoaderData<typeof loader>();
  const rawLocale = loaderData?.rawLocale || "en";

  return (
    <html lang={rawLocale}>
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
      <body className="min-h-screen bg-stone-50 text-neutral-950 dark:bg-black dark:text-white flex flex-col">
        {children}
        <ScrollRestoration nonce={cspNonce} />
        <Scripts nonce={cspNonce} />
      </body>
    </html>
  );
}

export default function App() {
  const { locale, messages, user } = useLoaderData<typeof loader>();

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <AuthProvider user={user}>
      <IntlProvider locale={locale} messages={messages} timeZone={timezone}>
        <Outlet />
        <Footer />
        <ToastContainer position="bottom-center" />
      </IntlProvider>
    </AuthProvider>
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
