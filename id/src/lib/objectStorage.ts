import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir } from "fs/promises";

import fs from "fs";

type ValueType = Buffer;

interface ObjectStorage {
  write(key: string, value: ValueType): Promise<string>;

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
  #client: S3Client;
  #scope: string;

  constructor(scope: string) {
    this.#client = new S3Client({});

    this.#scope = scope;
  }

  async write(key: string, value: ValueType) {
    const command = new PutObjectCommand({
      Bucket: this.#scope,
      Key: key,
      Body: value,
    });

    await this.#client.send(command);

    return this.url(key);
  }

  async delete(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.#scope,
      Key: key,
    });

    await this.#client.send(command);
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
