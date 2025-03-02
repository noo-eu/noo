import { getCookies } from "./cookies";

export class HttpRequest {
  #cookies?: Record<string, string>;
  #formData?: Promise<FormData>;
  #headers?: Record<string, string>;
  #query?: URLSearchParams;
  #url?: URL;

  constructor(public request: Request) {}

  get method() {
    return this.request.method;
  }

  isGet() {
    return this.method === "GET";
  }

  isPost() {
    return this.method === "POST";
  }

  get cookies(): Record<string, string> {
    if (!this.#cookies) {
      this.#cookies = getCookies(this.request.headers);
    }

    return this.#cookies;
  }

  cookie(name: string): string | undefined {
    return this.cookies[name];
  }

  get headers(): Record<string, string> {
    if (!this.#headers) {
      this.#headers = {};
      this.request.headers.forEach((value, key) => {
        this.#headers![key.toLowerCase()] = value;
      });
    }

    return this.#headers;
  }

  header(name: string): string | null {
    return this.request.headers.get(name);
  }

  get authorization(): string | null {
    return this.header("Authorization");
  }

  get protocol(): string {
    return this.request.headers.get("X-Forwarded-Proto") ?? "http";
  }

  get host(): string {
    return this.request.headers.get("Host") ?? "";
  }

  get baseUrl(): string {
    return `${this.protocol}://${this.host}`;
  }

  get remoteAddr(): string {
    const ipHeader =
      this.request.headers.get("X-Forwarded-For") ||
      this.request.headers.get("X-Real-Ip") ||
      "127.0.0.1";
    return ipHeader.split(",")[0];
  }

  get userAgent(): string {
    return this.request.headers.get("User-Agent") ?? "";
  }

  get url(): URL {
    if (!this.#url) {
      this.#url = new URL(this.request.url);
    }
    return this.#url;
  }

  get path(): string {
    return this.url.pathname;
  }

  get query(): URLSearchParams {
    if (!this.#query) {
      this.#query = this.url.searchParams;
    }

    return this.#query;
  }

  get queryParams(): Record<string, string> {
    return Object.fromEntries(this.query);
  }

  queryParam(name: string): string | null {
    return this.query.get(name);
  }

  isFormData(): boolean {
    return (
      this.header("Content-Type")?.startsWith(
        "application/x-www-form-urlencoded",
      ) ?? false
    );
  }

  isJson(): boolean {
    return this.header("Content-Type")?.startsWith("application/json") ?? false;
  }

  get formData(): Promise<FormData> {
    if (!this.isPost() || !this.isFormData()) {
      return Promise.reject(new Error("Request is not a form data"));
    }

    if (!this.#formData) {
      this.#formData = this.request.formData();
    }

    return this.#formData;
  }

  get json(): Promise<unknown> {
    if (!this.isPost() || !this.isJson()) {
      return Promise.reject(new Error("Request is not a JSON"));
    }

    return this.request.json();
  }

  get formParams(): Promise<Record<string, string>> {
    return this.formData.then((formData) => {
      return formData.entries().reduce(
        (params, [key, value]) => {
          params[key] = value.toString();
          return params;
        },
        {} as Record<string, string>,
      );
    });
  }
}
