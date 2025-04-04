// Create an HTTP handler that will pass each request through the given
// middleware functions. The first middleware function will be called with the
// request, and the next middleware function to call. The last middleware

import { Middleware } from ".";
import { HttpRequest } from "../http/request";

// function will be called with the request and no next function.
export function composeMiddleware(...middleware: Middleware[]): Middleware {
  function compose(request: HttpRequest, index: number): Promise<Response> {
    if (index >= middleware.length) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }

    return middleware[index](request, (req) => compose(req, index + 1));
  }

  return (request) => compose(request, 0);
}
