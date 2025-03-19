import { describe, expect, it, vi } from "vitest";
import { validateFileUpload } from "./fileValidations";
import { afterEach } from "node:test";

describe("validateFileUpload", () => {
  afterEach(() => {
    vi.resetModules();
  });

  // Mock File implementation since we're in Node environment
  function fileMock(content: Uint8Array): File {
    return {
      arrayBuffer: vi.fn(async () => content.buffer),
      size: content.length,
    } as unknown as File;
  }

  // Create test files
  const jpgContent = new Uint8Array([0xff, 0xd8, 0xff]); // JPEG magic numbers
  const pngContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic numbers

  const createJpegFile = (size = jpgContent.length) => {
    // For larger sizes, extend the content
    let content = jpgContent;
    if (size > jpgContent.length) {
      content = new Uint8Array(size);
      content.set(jpgContent);
    }
    return fileMock(content);
  };

  // Mock fileTypeFromBuffer to return correct types based on content
  vi.mock("file-type", () => ({
    fileTypeFromBuffer: async (buffer: Buffer) => {
      const array = new Uint8Array(buffer);

      if (array[0] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
      }

      if (array[0] === 0x89) {
        return { mime: "image/png", ext: "png" };
      }

      return null;
    },
  }));

  it("should pass for valid file", async () => {
    const file = createJpegFile();
    const maxSize = 100;
    const allowedTypes = ["image/jpeg"];

    const result = await validateFileUpload(file, maxSize, allowedTypes);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.mime).toBe("image/jpeg");
      expect(result.value.ext).toBe("jpg");
    }
  });

  it("should fail with 'missing' when file is null", async () => {
    const result = await validateFileUpload(null, 100, ["image/jpeg"]);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe("missing");
    }
  });

  it("should fail with 'size' when file exceeds size limit", async () => {
    const largeFile = createJpegFile(200);
    const maxSize = 100;
    const allowedTypes = ["image/jpeg"];

    const result = await validateFileUpload(largeFile, maxSize, allowedTypes);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe("size");
    }
  });

  it("should fail with 'mime' when file type is not allowed", async () => {
    const file = fileMock(pngContent);
    const maxSize = 100;
    const allowedTypes = ["image/jpeg"]; // Only jpeg allowed

    const result = await validateFileUpload(file, maxSize, allowedTypes);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe("mime");
    }
  });
});
