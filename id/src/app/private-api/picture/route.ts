import Users from "@/db/users";
import { HttpRequest } from "@/lib/http/request";
import { getObjectStorage } from "@/lib/objectStorage";
import { getSessionCookie, SessionsService } from "@/lib/SessionsService";
import { humanIdToUuid, randomSalt } from "@/utils";

async function getUser(request: Request) {
  const sid = new HttpRequest(request).header("X-User-ID");
  if (!sid) {
    return null;
  }

  const sessions = await new SessionsService(
    await getSessionCookie(),
  ).activeSessions();
  const id = humanIdToUuid(sid, "usr");
  const session = sessions.find((s) => s.userId === id);
  if (!session) {
    return null;
  }

  return session.user;
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const image = form.get("image") as File;

  const mime = image.type;
  if (!mime || !mime.startsWith("image/")) {
    return { error: "file_type", ok: undefined };
  }

  const ext = mime.split("/")[1];
  if (!["jpeg", "png", "gif"].includes(ext)) {
    return { error: "file_type", ok: undefined };
  }

  if (user.picture) {
    const store = getObjectStorage("noo-user");
    await store.delete(user.picture);
  }

  const key = randomSalt(64, "base64url");
  const url = await getObjectStorage("noo-user").write(
    key + "." + ext,
    Buffer.from(await image.arrayBuffer()),
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
    const store = getObjectStorage("noo-user");
    await store.delete(user.picture);
  }

  await Users.update(user.id, { picture: null });
  return Response.json({ ok: true });
}
