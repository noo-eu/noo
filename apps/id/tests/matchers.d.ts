import { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { Matchers, AsymmetricMatchers } from "bun:test";

declare module "vitest" {
  interface Assertion<T>
    extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}
