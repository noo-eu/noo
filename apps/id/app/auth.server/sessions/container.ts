import { checkVerifier, createVerifier } from "@noo/lib/verifier";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { ContainerSession } from "~/db.server/containerSessions";
import repository, { afterCommit } from "~/db.server/repository";
import { repoToSession, type SessionError } from "./errors";
import { getSessionCookie, writeSessionCookies } from "./store";
import { decodeSessionToken, encodeSessionToken } from "./token";

/**
 * Load the current container session from the request and validate it.
 *
 * Reads the session cookie, decodes the token, loads the DB record, and
 * validates the embedded verifier against the stored digest.
 *
 * @param request - Incoming HTTP request containing cookies.
 * @returns ResultAsync with the live container session or a SessionError.
 */
export const loadContainerSession = (
  request: Request,
): ResultAsync<ContainerSession, SessionError> =>
  getSessionCookie(request)
    .andThen(decodeSessionToken)
    .andThen(({ id, verifier }) =>
      repository.containerSessions
        .find(id)
        .mapErr(repoToSession)
        .map((container) => ({
          container,
          verifier,
        })),
    )
    .andThen(({ container, verifier }) => verifySession(container, verifier));

/**
 * Create a brand new container session and set cookies on the response.
 *
 * Generates a verifier pair, persists a session row, and writes both the
 * primary session cookie and the lightweight "check" cookie.
 *
 * @param jar - Headers collection to which Set-Cookie values will be appended.
 * @returns ResultAsync with the created container session or a SessionError.
 */
export const startContainerSession = (
  jar: Headers,
): ResultAsync<ContainerSession, SessionError> => {
  const { verifier, digest } = createVerifier();

  return repository.containerSessions
    .create({ verifierDigest: digest })
    .mapErr(repoToSession)
    .andTee((container) => {
      afterCommit(() =>
        writeSessionCookies(
          jar,
          encodeSessionToken({ id: container.id, verifier }),
          0,
        ),
      );
    });
};

/**
 * Rotate the container session verifier and update cookies.
 *
 * Issues a new verifier, updates the stored digest/version atomically, and
 * schedules cookie writes after commit.
 *
 * @param container - Existing container session to rotate.
 * @param jar - Headers collection to which Set-Cookie values will be appended.
 * @returns ResultAsync with the updated container session or a SessionError.
 */
export const rotateContainerSession = (
  container: ContainerSession,
  jar: Headers,
): ResultAsync<ContainerSession, SessionError> => {
  const { verifier, digest } = createVerifier();

  return repository.containerSessions
    .refresh(container.id, digest, container.version)
    .mapErr(repoToSession)
    .andTee(() => {
      afterCommit(() =>
        writeSessionCookies(
          jar,
          encodeSessionToken({ id: container.id, verifier }),
          container.version,
        ),
      );
    });
};

/**
 * Ensure a container session exists for the request, creating one if necessary.
 *
 * @param request - Incoming HTTP request.
 * @param jar - Headers collection to which Set-Cookie values will be appended.
 * @returns ResultAsync with the live container session or a SessionError.
 */
export const ensureContainerSession = (request: Request, jar: Headers) =>
  loadContainerSession(request).orElse(() => startContainerSession(jar));

/**
 * Check a raw verifier string against the session's stored digest.
 *
 * @param session - Container session containing the stored digest.
 * @param verifier - Raw verifier (base64url) taken from the token.
 * @returns ResultAsync resolving to the same session on success, or NO_SESSION on failure.
 */
export const verifySession = (
  session: ContainerSession,
  verifier: string,
): ResultAsync<ContainerSession, SessionError> => {
  if (checkVerifier(verifier, session.verifierDigest)) {
    return okAsync(session);
  }

  return errAsync({
    code: "NO_SESSION",
    message: "Invalid session verifier",
  });
};
