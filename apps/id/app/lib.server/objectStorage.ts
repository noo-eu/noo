import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir } from "fs/promises";

import fs from "fs";

type ValueType = Buffer;

type Options = {
  ContentType?: string;
};

interface ObjectStorage {
  write(key: string, value: ValueType, options?: Options): Promise<string>;

  delete(key: string): Promise<void>;
}

// For development, test and self-hosted environments.
// Writes files to the local filesystem, at public/uploads.
class FileStorage implements ObjectStorage {
  readonly #ROOT = "public/uploads/";

  constructor(scope: string) {
    this.#ROOT += scope + "/";
  }

  async write(key: string, value: ValueType) {
    const fullPath = this.#ROOT + key;
    const dir = fullPath.split("/").slice(0, -1).join("/");

    await mkdir(dir, { recursive: true });
    await fs.promises.writeFile(fullPath, value);

    return this.url(key);
  }

  async delete(key: string) {
    try {
      await fs.promises.unlink("public" + key);
    } catch (e) {
      console.error(e);
    }
  }

  url(key: string) {
    return "/" + this.#ROOT.replace("public/", "") + key;
  }
}

// For production environments, an S3-compatible object storage.
class S3Storage implements ObjectStorage {
  readonly #client: S3Client;
  readonly #scope: string;

  constructor(scope: string) {
    this.#client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      // The S3 client v3 requires a region, even if the endpoint doesn't use it.
      region: process.env.S3_REGION ?? "us-east-1",
    });

    this.#scope = scope;
  }

  async write(key: string, value: ValueType, options?: Options) {
    const command = new PutObjectCommand({
      Bucket: this.#scope,
      Key: key,
      Body: value,
      ...options,
    });

    await this.#client.send(command);

    return this.url(key);
  }

  async delete(key: string) {
    // Split the path from the host and remove the leading slash.
    const url = new URL(key);
    key = url.pathname.slice(1);

    const command = new DeleteObjectCommand({
      Bucket: this.#scope,
      Key: key,
    });

    await this.#client.send(command);
  }

  url(key: string) {
    if (process.env[`S3_PUBLIC_URL_${this.#scope}`]) {
      return `${process.env[`S3_PUBLIC_URL_${this.#scope}`]}/${key}`;
    }

    const url = new URL(process.env.S3_ENDPOINT!);
    url.hostname = `${this.#scope}.${url.hostname}`;

    const endpoint = url.toString().replace(/\/$/, "");
    return `${endpoint}/${key}`;
  }
}

export function getObjectStorage(scope: string): ObjectStorage {
  return process.env.S3_ENDPOINT
    ? new S3Storage(scope)
    : new FileStorage(scope);
}
