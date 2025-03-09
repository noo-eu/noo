import { GlobalRegistrator } from "@happy-dom/global-registrator";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "bun:test";

expect.extend(matchers);

const originalResponse = global.Response;
const originalRequest = global.Request;

GlobalRegistrator.register({
  // url: "https://cdn.jsdelivr.net/npm/@happy-dom/global-registrator@1.0.0/dist/global-registrator.min.js",
});

// Sorry happy-dom, but we need the original implementations. (happy-dom
// overwrites Request and Response to make them look like the browser's
// implementations, but that breaks all non-component tests)
global.Response = originalResponse;
global.Request = originalRequest;
