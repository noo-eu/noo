type DeviceClass = "desktop" | "mobile" | "tablet";
type OperatingSystem = "macOS" | "Windows" | "Android" | "iOS" | "Linux";

export type Device = {
  class: DeviceClass;
  model?: string;
  os?: OperatingSystem;
  browser?: string;
};

export function userAgentToDevice(userAgent: string | null): Device {
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
  if (parts[1]?.includes("Android ")) {
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

export function userAgentGroup(device: Device) {
  if (device.model) {
    return device.model;
  }

  if (device.os) {
    return device.os + " " + device.class;
  }

  return device.class;
}
