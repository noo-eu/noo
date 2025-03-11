"use client";

import { uuidToHumanId } from "@/utils";
import { CheckBadgeIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { useFormatter, useTranslations } from "next-intl";
import { terminateSession } from "../actions";

type Props = {
  sessions: {
    id: string;
    ip: string;
    userAgent: string | null;
    lastUsedAt: Date;
  }[];
  currentSessionId: string;
  userId: string;
};

export function SessionsPage({ sessions, currentSessionId, userId }: Props) {
  const sessionId = uuidToHumanId(currentSessionId, "sess");
  const t = useTranslations("security");

  const withDevice = sessions.map((session) => {
    return {
      ...session,
      device: userAgentToDevice(session.userAgent),
    };
  });

  const groupedByDevice = withDevice.reduce(
    (acc, session) => {
      const key = groupingKey(session.device);
      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(session);
      return acc;
    },
    {} as Record<string, Props["sessions"]>,
  );

  return (
    <div className="flex flex-col items-center max-w-3xl mx-auto p-4 w-full">
      <h1 className="text-4xl font-medium mb-16">{t("sessions.title")}</h1>

      {Object.entries(groupedByDevice).map(([key, sessions]) => {
        return (
          <SessionsGroup
            key={key}
            name={key}
            sessions={sessions}
            currentSessionId={sessionId}
            userId={userId}
          />
        );
      })}
    </div>
  );
}

function SessionsGroup({
  name,
  sessions,
  currentSessionId,
  userId,
}: {
  name: string;
  sessions: Props["sessions"];
  currentSessionId: string;
  userId: string;
}) {
  return (
    <div className="w-full border border-black/25 dark:border-white/25 rounded-lg p-8 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <h2 className="text-2xl font-medium">{name}</h2>
      <div className="grid grid-cols-1 gap-6 divide-y divide-black/25 dark:divide-white/25">
        {sessions.map((session) => (
          <Session
            key={session.id}
            session={session}
            isActive={session.id === currentSessionId}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}

function Session({
  session,
  isActive,
  userId,
}: {
  session: Props["sessions"][0];
  isActive: boolean;
  userId: string;
}) {
  const formatter = useFormatter();
  const ua = userAgentToDevice(session.userAgent);
  const t = useTranslations("security");

  return (
    <div className="pb-6 px-4 last:pb-0 flex flex-row">
      <div>
        {ua.browser && (
          <p>
            <strong>{ua.browser}</strong>
          </p>
        )}
        <p>IP: {cleanIp(session.ip)}</p>
        <p>
          {t("sessions.lastUsed", {
            lastUsedAgo: formatter.relativeTime(session.lastUsedAt),
          })}
        </p>
        {isActive && (
          <p className="text-blue-700 flex items-center gap-2 mt-2">
            <CheckBadgeIcon className="w-6 h-6" />
            {t("sessions.currentSession")}
          </p>
        )}
      </div>
      <div className="ms-auto">
        {!isActive && (
          <form action={terminateSession.bind(null, userId, session.id)}>
            <button
              title="End session"
              className="cursor-pointer p-2 rounded-full bg-red-700/15 hover:bg-red-700/35 text-red-700 hover:text-white"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function cleanIp(ip: string) {
  return ip.replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, "$1");
}

type DeviceClass = "desktop" | "mobile" | "tablet";
type OperatingSystem = "macOS" | "Windows" | "Android" | "iOS" | "Linux";

type Device = {
  class: DeviceClass;
  model?: string;
  os?: OperatingSystem;
  browser?: string;
};

function userAgentToDevice(userAgent: string | null): Device {
  if (!userAgent) {
    return {
      class: "desktop",
    };
  }

  if (userAgent.includes("Android")) {
    return {
      // We could detect tablets, but we'd need to categorize all models. We
      // don't need it that much, for now.
      class: "mobile",
      model: extractDeviceType(userAgent) ?? "Android",
      os: "Android",
      browser: extractBrowser(userAgent),
    };
  }

  if (userAgent.includes("Linux")) {
    return {
      class: "desktop",
      os: "Linux",
      browser: extractBrowser(userAgent),
    };
  }

  if (userAgent.includes("iPhone")) {
    return {
      class: "mobile",
      os: "iOS",
      browser: extractBrowser(userAgent),
    };
  }

  if (userAgent.includes("iPad")) {
    return {
      class: "tablet",
      os: "iOS",
      browser: extractBrowser(userAgent),
    };
  }

  if (userAgent.includes("Mac OS")) {
    return {
      class: "desktop",
      os: "macOS",
      browser: extractBrowser(userAgent),
    };
  }

  if (userAgent.includes("Windows")) {
    return {
      class: "desktop",
      os: "Windows",
      browser: extractBrowser(userAgent),
    };
  }

  return {
    class: "desktop",
  };
}

function extractDeviceType(userAgent: string): string | undefined {
  const bracketStart = userAgent.indexOf("(");
  const bracketEnd = userAgent.indexOf(")");
  const os = userAgent.slice(bracketStart + 1, bracketEnd);

  const parts = os.split(";");
  if (parts[1] && parts[1].includes("Android ")) {
    const device = parts[2]?.trim();
    if (device) {
      // Remove "Build/" from the device name
      return device.replace(" Build/", "");
    }
  }
}

function extractBrowser(userAgent: string): string | undefined {
  // The list is ordered in a specific way.
  // Many browsers fake being Chrome or Safari, so we need to check them first.

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }

  if (/EdgA?\//.test(userAgent)) {
    return "Edge";
  }

  if (userAgent.includes("OPR/")) {
    return "Opera";
  }

  if (userAgent.includes("Brave/")) {
    return "Brave";
  }

  if (userAgent.includes("Vivaldi/")) {
    return "Vivaldi";
  }

  if (userAgent.includes("Chromium/")) {
    return "Chromium";
  }

  if (userAgent.includes("SamsungBrowser/")) {
    return "Samsung Internet";
  }

  if (userAgent.includes("UCBrowser/")) {
    return "UC Browser";
  }

  if (userAgent.includes("DuckDuckGo/")) {
    return "DuckDuckGo";
  }

  if (userAgent.includes("Safari/")) {
    return "Safari";
  }

  if (userAgent.includes("Chrome/")) {
    return "Chrome";
  }
}

function groupingKey(device: Device) {
  if (device.model) {
    return device.model;
  }

  if (device.os) {
    return device.os + " " + device.class;
  }

  return device.class;
}
