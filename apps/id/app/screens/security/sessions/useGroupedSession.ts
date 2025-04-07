import { type ClientSession } from "~/types/ClientSession.client";
import {
  type Device,
  userAgentGroup,
  userAgentToDevice,
} from "./userAgentUtils";

export function useGroupedSessions(sessions: ClientSession[]) {
  return sessions.reduce(
    (acc, session) => {
      const device = userAgentToDevice(session.userAgent);
      const key = userAgentGroup(device);

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push({ ...session, device });
      return acc;
    },
    {} as Record<string, (ClientSession & { device: Device })[]>,
  );
}
