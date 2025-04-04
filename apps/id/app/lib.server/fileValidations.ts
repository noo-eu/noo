import { fileTypeFromBuffer, type FileTypeResult } from "file-type";
import { err, errAsync, ok, okAsync, Result, ResultAsync } from "neverthrow";

type FileValidationError = "missing" | "size" | "mime";

// This function validates a file upload. It checks if the file is missing, if
// it's too big, and if it's of the correct MIME type. If the file is valid, it
// returns and object with the MIME type and the recommended file extension.
export function validateFileUpload(
  file: File | null,
  maxFileSize: number,
  allowedMimeTypes: string[],
): ResultAsync<FileTypeResult, FileValidationError> {
  return basicValidation(file, maxFileSize)
    .asyncAndThen(fileToBuffer)
    .andThen(fileType)
    .andThen(validateMimeType.bind(null, allowedMimeTypes));
}

function basicValidation(
  file: File | null,
  maxFileSize: number,
): Result<File, FileValidationError> {
  if (!file) {
    return err("missing");
  }

  if (file.size > maxFileSize) {
    return err("size");
  }

  return ok(file);
}

function fileType(
  buffer: Buffer,
): ResultAsync<FileTypeResult, FileValidationError> {
  return ResultAsync.fromPromise(
    fileTypeFromBuffer(buffer),
    () => "mime" as const,
  ).andThen((fileType) => {
    if (!fileType) {
      return errAsync("mime" as const);
    }
    return okAsync(fileType);
  });
}

function fileToBuffer(file: File): ResultAsync<Buffer, FileValidationError> {
  return ResultAsync.fromPromise(file.arrayBuffer(), () => "mime" as const).map(
    (arrayBuffer) => Buffer.from(arrayBuffer),
  );
}

function validateMimeType(
  allowedMimeTypes: string[],
  fileType: FileTypeResult,
): Result<FileTypeResult, FileValidationError> {
  if (!allowedMimeTypes.includes(fileType.mime)) {
    return err("mime");
  }

  return ok(fileType);
}
