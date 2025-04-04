import { describe, it, expect } from "vitest";
import { userAgentToDevice, userAgentGroup, Device } from "./userAgentUtils";

describe("userAgentUtils", () => {
  describe("userAgentToDevice", () => {
    it("handles null user agent", () => {
      const result = userAgentToDevice(null);
      expect(result).toEqual({
        class: "desktop",
      });
    });

    it("handles empty user agent", () => {
      const result = userAgentToDevice("");
      expect(result).toEqual({
        class: "desktop",
      });
    });

    describe("Android devices", () => {
      it("detects Android phone", () => {
        const userAgent =
          "Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("mobile");
        expect(result.os).toBe("Android");
        expect(result.browser).toBe("Chrome");
        expect(result.model).toBe("SM-G990B");
      });

      it("handles Android with no specific model", () => {
        const userAgent =
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("mobile");
        expect(result.os).toBe("Android");
        expect(result.browser).toBe("Chrome");
        expect(result.model).toBe("Android");
      });

      it("extracts device name from Android Build string", () => {
        const userAgent =
          "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36";
        const result = userAgentToDevice(userAgent);

        expect(result.model).toBe("Pixel 6");
      });
    });

    describe("iOS devices", () => {
      it("detects iPhone", () => {
        const userAgent =
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("mobile");
        expect(result.os).toBe("iOS");
        expect(result.browser).toBe("Safari");
      });

      it("detects iPad", () => {
        const userAgent =
          "Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("tablet");
        expect(result.os).toBe("iOS");
        expect(result.browser).toBe("Safari");
      });
    });

    describe("Desktop operating systems", () => {
      it("detects macOS", () => {
        const userAgent =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("desktop");
        expect(result.os).toBe("macOS");
        expect(result.browser).toBe("Chrome");
      });

      it("detects Windows", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("desktop");
        expect(result.os).toBe("Windows");
        expect(result.browser).toBe("Chrome");
      });

      it("detects Linux", () => {
        const userAgent =
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0";
        const result = userAgentToDevice(userAgent);

        expect(result.class).toBe("desktop");
        expect(result.os).toBe("Linux");
        expect(result.browser).toBe("Chrome");
      });
    });

    describe("Browser detection", () => {
      it("detects Firefox", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Firefox");
      });

      it("detects Edge", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Edg/112.0.1722.48";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Edge");
      });

      it("detects Edge on mobile", () => {
        const userAgent =
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgA/112.0.1722.44 Version/16.0 Mobile/15E148 Safari/604.1";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Edge");
      });

      it("detects Opera", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 OPR/98.0.4759.39";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Opera");
      });

      it("detects Samsung Internet", () => {
        const userAgent =
          "Mozilla/5.0 (Linux; Android 13; SM-G990B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Samsung Internet");
      });

      it("detects Safari", () => {
        const userAgent =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Safari");
      });

      it("correctly prioritizes browser detection order", () => {
        // This contains Chrome and Safari, but Firefox should be detected first
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0 Chrome/112.0.0.0 Safari/537.36";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Firefox");
      });

      it("detects Brave", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Brave/1.50.114";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Brave");
      });

      it("detects Vivadi", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Vivaldi/4.0.2312.38";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Vivaldi");
      });

      it("detects Chromium", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Chromium/112.0.0.0";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("Chromium");
      });

      it("detects UC Browser", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 UCBrowser/1.2.3";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("UC Browser");
      });

      it("detects DuckDuckGo Browser", () => {
        const userAgent =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 DuckDuckGo/1.2.3";
        const result = userAgentToDevice(userAgent);
        expect(result.browser).toBe("DuckDuckGo");
      });
    });

    it("returns default desktop for unknown user agents", () => {
      const userAgent = "Some completely unknown user agent";
      const result = userAgentToDevice(userAgent);
      expect(result).toEqual({
        class: "desktop",
      });
    });
  });

  describe("userAgentGroup", () => {
    it("returns device model when available", () => {
      const device: Device = {
        class: "mobile",
        model: "Pixel 6",
        os: "Android",
      };
      expect(userAgentGroup(device)).toBe("Pixel 6");
    });

    it("returns OS and class when model is not available", () => {
      const device: Device = {
        class: "desktop",
        os: "Windows",
      };
      expect(userAgentGroup(device)).toBe("Windows desktop");
    });

    it("returns just class when OS is not available", () => {
      const device: Device = {
        class: "desktop",
      };
      expect(userAgentGroup(device)).toBe("desktop");
    });

    it("handles a tablet with OS", () => {
      const device: Device = {
        class: "tablet",
        os: "iOS",
      };
      expect(userAgentGroup(device)).toBe("iOS tablet");
    });
  });
});
