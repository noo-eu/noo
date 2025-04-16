import { sha256 } from "@noo/lib/crypto";
import { uuidToHumanId } from "@noo/lib/humanIds";
import { expect, test } from "@playwright/test";
import { UserinfoEndpoint } from "tests/pages/UserinfoEndpoint";
import { makeOidcAuthRequest, startOidcFlow, signInAndConsent } from "./utils";

const client_id = uuidToHumanId("00000000-0000-0000-0000-000000000001", "oidc");

test.describe("OpenID Provider", () => {
  test.describe("Implicit Flow", () => {
    test("implicit flow with PKCE", async ({ page, request }) => {
      const randomChallenge = `challenge-${Math.random().toString(16).slice(2)}`;
      const basicRequest = makeOidcAuthRequest({
        client_id,
        response_type: "id_token token",
        code_challenge_method: "S256",
        code_challenge: sha256(randomChallenge).digest("base64url"),
      });

      const callbackRequest = await startOidcFlow(page, async () => {
        await signInAndConsent(page, basicRequest);
      });
      expect(callbackRequest.method()).toBe("GET");

      // The page.route method does not intercept the fragment. We should, however
      // be able to get it from the current page URL.
      await page.waitForURL("**/cb*");

      const callbackUri = new URL(page.url());
      const fragment = new URLSearchParams(callbackUri.hash.slice(1));

      expect(fragment.get("code")).toBeNull();
      expect(fragment.get("access_token")).toBeDefined();
      expect(fragment.get("id_token")).toBeDefined();
      expect(fragment.get("expires_in")).toBeDefined();
      expect(fragment.get("state")).toBe(basicRequest.state);

      const accessToken = fragment.get("access_token")!;

      const userinfo = new UserinfoEndpoint(request);
      const userinfoResponse = await userinfo.get(accessToken);

      expect(userinfoResponse).toMatchObject({
        sub: expect.any(String),
        name: expect.any(String),
      });
    });
  });
});
