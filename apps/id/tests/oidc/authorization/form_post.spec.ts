import { uuidToHumanId } from "@noo/lib/humanIds";
import { expect, test } from "@playwright/test";
import {
  makeOidcAuthRequest,
  signInAndConsent,
  startOidcFlow,
  completeOidcFlow,
} from "./utils";

const client_id = uuidToHumanId("00000000-0000-0000-0000-000000000001", "oidc");

test.describe("OpenID Provider", () => {
  test.describe("Authorization Code Flow", () => {
    test("with form_post response_type", async ({ page, request }) => {
      const basicRequest = makeOidcAuthRequest({
        client_id,
        response_mode: "form_post",
      });

      const callbackRequest = await startOidcFlow(page, async () => {
        await signInAndConsent(page, basicRequest);
      });

      expect(callbackRequest.method()).toBe("POST");
      const params = callbackRequest.postDataJSON();
      const code = params.code;
      const state = params.state;

      expect(code).toBeDefined();
      expect(state).toBe(basicRequest.state);

      // Exchange the code for an access token
      const { userinfo } = await completeOidcFlow(request, basicRequest, {
        code: code!,
      });

      // We've only requested the "openid profile" scope, so we should get the
      // "sub" claim, and a few basic profile claims
      expect(userinfo).toMatchObject({
        sub: expect.any(String),
        name: expect.any(String),
      });
    });
  });
});
