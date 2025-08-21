import { checkVerifier, createVerifier } from "@noo/lib/verifier";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import type { ContainerSession } from "~/db.server/containerSessions";
import type { Repository } from "~/db.server/repository";
import { repoToSession, type SessionError } from "./errors";
import { getSessionCookie, writeSessionCookies } from "./store";
import { decodeSessionToken, encodeSessionToken } from "./token";

export const loadContainerSession = (
  tx: Repository,
  request: Request,
): ResultAsync<ContainerSession, SessionError> =>
  getSessionCookie(request)
    .andThen(decodeSessionToken)
    .andThen(({ id, verifier }) =>
      tx.containerSessions
        .find(id)
        .mapErr(repoToSession)
        .map((container) => ({
          container,
          verifier,
        })),
    )
    .andThen(({ container, verifier }) => verifySession(container, verifier));

export const startContainerSession = (
  tx: Repository,
  jar: Headers,
): ResultAsync<ContainerSession, SessionError> => {
  const { verifier, digest } = createVerifier();

  return tx.containerSessions
    .create({ verifierDigest: digest })
    .mapErr(repoToSession)
    .andTee((container) => {
      tx.afterCommit(() =>
        writeSessionCookies(
          jar,
          encodeSessionToken({ id: container.id, verifier }),
          0,
        ),
      );
    });
};

export const rotateContainerSession = (
  tx: Repository,
  container: ContainerSession,
  jar: Headers,
): ResultAsync<ContainerSession, SessionError> => {
  const { verifier, digest } = createVerifier();

  return tx.containerSessions
    .refresh(container.id, digest, container.version)
    .mapErr(repoToSession)
    .andTee(() => {
      tx.afterCommit(() =>
        writeSessionCookies(
          jar,
          encodeSessionToken({ id: container.id, verifier }),
          container.version,
        ),
      );
    });
};

export const ensureContainerSession = (
  tx: Repository,
  request: Request,
  jar: Headers,
) =>
  loadContainerSession(tx, request).orElse(() =>
    startContainerSession(tx, jar),
  );

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
