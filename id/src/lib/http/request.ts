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

  get bearerToken(): string | null {
    const auth = this.authorization;
    if (!auth) {
      return null;
    }

    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return null;
    }

    return parts[1];
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
      this.request.headers.get("X-Forwarded-For") ??
      this.request.headers.get("X-Real-Ip") ??
      "0.0.0.0";
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

  isMultipart(): boolean {
    return (
      this.header("Content-Type")?.startsWith("multipart/form-data") ?? false
    );
  }

  isJson(): boolean {
    return this.header("Content-Type")?.startsWith("application/json") ?? false;
  }

  get formData(): Promise<FormData> {
    if (!this.isPost() || !(this.isFormData() || this.isMultipart())) {
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

  get formParams(): Promise<Record<string, string | undefined>> {
    return this.formData.then((formData) => {
      const entries = formData.entries();
      const params: Record<string, string> = {};

      for (const [key, value] of entries) {
        const val = value.valueOf();
        if (typeof val === "string") {
          params[key] = val;
        } else {
          throw new Error("Form data value is not a string");
        }
      }

      return params;
    });
  }

  get params(): Promise<Record<string, string | undefined>> {
    const query = this.queryParams;
    if (this.isPost() && this.isFormData()) {
      return this.formParams.then((formParams) => ({
        ...query,
        ...formParams,
      }));
    }

    return Promise.resolve(query);
  }

  buildUrl(path: string, query?: Record<string, string>): string {
    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }
}
