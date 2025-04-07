import crypto from "node:crypto";
import type { ActionFunctionArgs } from "react-router";
import sharp from "sharp";
import { userContext } from "~/auth.server/serverContext";
import Users from "~/db.server/users.server";
import { validateFileUpload } from "~/lib.server/fileValidations";
import { getObjectStorage } from "~/lib.server/objectStorage";

const PICTURE_SIZE = process.env.PICTURE_SIZE
  ? parseInt(process.env.PICTURE_SIZE)
  : 512; // 512px
const MAX_FILE_SIZE = process.env.PICTURE_MAX_UPLOAD_SIZE
  ? parseInt(process.env.PICTURE_MAX_UPLOAD_SIZE)
  : 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"];

export async function action({ request, context }: ActionFunctionArgs) {
  const image = (await request.formData()).get("image") as File | null;
  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  // process the upload and return a File
  const validation = await validateFileUpload(
    image,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
  );
  if (validation.isErr()) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const resizedImageBuffer = await sharp(await image.arrayBuffer())
    .resize({
      width: PICTURE_SIZE,
      height: PICTURE_SIZE,
      fit: "cover",
      position: "center",
    })
    .toBuffer();

  const user = context.get(userContext);
  if (user.picture) {
    const store = getObjectStorage("noousr");
    await store.delete(user.picture);
  }

  // We can safely assert the type since we already validated it's in ALLOWED_MIME_TYPES
  const key = crypto.randomBytes(64).toString("base64url");
  const url = await getObjectStorage("noousr").write(
    key + "." + validation.value.ext,
    resizedImageBuffer,
    {
      ContentType: validation.value.mime,
    },
  );

  await Users.update(user.id, { picture: url });

  return { ok: true };
}
