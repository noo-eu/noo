import { HttpRequest } from "../http/request";

export type Middleware = (
  request: HttpRequest,
  next?: Middleware,
) => Promise<Response>;

export * from "./composeMiddleware";
export * from "./cors";
export * from "./preventCache";
