import Users from "@/db/users";
import { HttpRequest } from "@/lib/http/request";
import { getObjectStorage } from "@/lib/objectStorage";
import { SessionsService } from "@/lib/SessionsService";
import { randomSalt } from "@/utils";
import sharp from "sharp";
import { validateFileUpload } from "@/lib/http/fileValidations";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"];
const PICTURE_SIZE = 512;

async function getUser(request: Request) {
  const uid = new HttpRequest(request).header("X-User-ID");
  if (!uid) {
    return undefined;
  }

  const user = await SessionsService.userFor(uid);
  if (!user) {
    return undefined;
  }

  return user;
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const image = form.get("image") as File | null;

  const validation = await validateFileUpload(
    image,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
  );
  if (validation.isErr()) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  // Process image with sharp: resize to 512x512
  const resizedImageBuffer = await sharp(await image!.arrayBuffer())
    .resize({
      width: PICTURE_SIZE,
      height: PICTURE_SIZE,
      fit: "cover",
      position: "center",
    })
    .toBuffer();

  if (user.picture) {
    const store = getObjectStorage("noousr");
    await store.delete(user.picture);
  }

  // We can safely assert the type since we already validated it's in ALLOWED_MIME_TYPES
  const key = randomSalt(64, "base64url");
  const url = await getObjectStorage("noousr").write(
    key + "." + validation.value.ext,
    resizedImageBuffer,
    {
      ContentType: validation.value.mime,
    },
  );

  await Users.update(user.id, { picture: url });

  return Response.json({ error: undefined, ok: true });
}

export async function DELETE(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (user.picture) {
    const store = getObjectStorage("noousr");
    await store.delete(user.picture);
  }

  await Users.update(user.id, { picture: null });
  return Response.json({ ok: true });
}
