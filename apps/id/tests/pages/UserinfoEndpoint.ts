import { expect, type APIRequestContext } from "@playwright/test";

export class UserinfoEndpoint {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async get(accessToken: string) {
    const userinfoResponse = await this.request.get("/oidc/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(userinfoResponse.ok()).toBeTruthy();
    return await userinfoResponse.json();
  }
}
