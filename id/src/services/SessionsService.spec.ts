import { describe, it, expect, beforeAll } from "bun:test";
import { SessionsService } from "./SessionsService";
import db from "@/db";
import { sessions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

describe("SessionsService", async () => {
  let userId: string = (await db.query.users.findFirst())!.id;

  describe("buildCookie", () => {
    it("returns the value to place in the cookie", () => {
      const service = new SessionsService("a b c");
      expect(service.buildCookie()).toEqual("a b c");
    });
  });

  describe("startSession", () => {
    it("creates a session", async () => {
      const service = new SessionsService("");
      await service.startSession(userId, "1.2.3.4", "Mozilla/5.0");

      const cookie = service.buildCookie();
      expect(cookie).toMatch(/^[A-Za-z0-9+\/=]+$/);

      // extract the session ID from the cookie
      const decoded = Buffer.from(cookie, "base64");
      const uuid =
        decoded.toString("hex", 0, 4) +
        "-" +
        decoded.toString("hex", 4, 6) +
        "-" +
        decoded.toString("hex", 6, 8) +
        "-" +
        decoded.toString("hex", 8, 10) +
        "-" +
        decoded.toString("hex", 10, 16);

      const created = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), eq(sessions.id, uuid)))
        .limit(1)
        .execute();

      expect(created).toHaveLength(1);
      expect(created[0].ip).toEqual("1.2.3.4");

      // Make sure the session is recognized as valid by triggering a cleanup
      const service2 = new SessionsService(cookie);
      await service2.cleanup();

      expect(service2.buildCookie()).toEqual(cookie);
    });
  });
});
