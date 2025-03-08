import { S3Client } from "bun";
import { mkdir } from "fs/promises";

type ValueType = string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer;

interface ObjectStorage {
  write(key: string, value: ValueType): Promise<void>;

  delete(key: string): Promise<void>;
}

// For development, test and self-hosted environments.
// Writes files to the local filesystem, at public/uploads.
class FileStorage implements ObjectStorage {
  #ROOT = "public/uploads/";

  constructor(scope: string) {
    this.#ROOT += scope + "/";
  }

  async write(key: string, value: ValueType) {
    const fullPath = this.#ROOT + key;
    const dir = fullPath.split("/").slice(0, -1).join("/");

    await mkdir(dir, { recursive: true });
    await Bun.file(this.#ROOT + key).write(value);
  }

  async delete(key: string) {
    await Bun.file(this.#ROOT + key).delete();
  }

  url(key: string) {
    return "/" + this.#ROOT.replace("public/", "") + key;
  }
}

// For production environments, an S3-compatible object storage.
class S3Storage implements ObjectStorage {
  #client: S3Client;
  #scope: string;

  constructor(scope: string) {
    this.#client = new S3Client({
      bucket: scope,
    });

    this.#scope = scope;
  }

  async write(key: string, value: ValueType) {
    await this.#client.file(key).write(value);
  }

  async delete(key: string) {
    await this.#client.file(key).delete();
  }

  url(key: string) {
    return `${process.env.S3_ENDPOINT}/${this.#scope}/${key}`;
  }
}

export function getObjectStorage(scope: string): ObjectStorage {
  return process.env.S3_ENDPOINT
    ? new S3Storage(scope)
    : new FileStorage(scope);
}
