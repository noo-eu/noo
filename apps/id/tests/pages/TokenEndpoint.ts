import { expect, type APIRequestContext } from "@playwright/test";

export class TokenEndpoint {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async post(
    formData: Record<string, string>,
    headers: Record<string, string>,
  ) {
    const tokenResponse = await this.request.post("/oidc/token", {
      data: new URLSearchParams(formData).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
    });

    expect(tokenResponse.ok).toBeTruthy();
    return await tokenResponse.json();
  }
}
