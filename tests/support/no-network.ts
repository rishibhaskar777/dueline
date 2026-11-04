import { afterEach, beforeEach } from "vitest";

const realFetch = globalThis.fetch;

// A test that needs a response mocks or spies on fetch itself; one that forgets fails at once
// instead of waiting for a real server.
beforeEach(() => {
  globalThis.fetch = () =>
    Promise.reject(new Error("Network is disabled in unit tests: mock this request"));
});

afterEach(() => {
  globalThis.fetch = realFetch;
});
