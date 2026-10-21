import assert from "node:assert/strict";
import test from "node:test";

import {
  createMemoryStore,
  createRateLimiter,
} from "../src/middleware/rateLimit.middleware.js";

const invoke = async (limiter, request) => {
  const response = {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let continued = false;
  await limiter(request, response, () => {
    continued = true;
  });
  return { ...response, continued };
};

test("rate limiter blocks after the configured count and reports retry headers", async () => {
  let currentTime = 1_000;
  const limiter = createRateLimiter({
    limit: 2,
    windowMs: 60_000,
    now: () => currentTime,
    store: createMemoryStore(() => currentTime),
  });
  const request = { ip: "192.0.2.1" };

  assert.equal((await invoke(limiter, request)).continued, true);
  assert.equal((await invoke(limiter, request)).continued, true);
  const blocked = await invoke(limiter, request);
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers["RateLimit-Limit"], "2");
  assert.equal(blocked.headers["RateLimit-Remaining"], "0");
  assert.equal(blocked.headers["Retry-After"], "60");
  assert.match(blocked.body.message, /too many requests/i);

  currentTime += 60_000;
  assert.equal((await invoke(limiter, request)).continued, true, "the bucket resets after its window");
});

test("rate limiter keeps separate clients and can key authenticated actions by user", async () => {
  const limiter = createRateLimiter({
    limit: 1,
    windowMs: 60_000,
    keyGenerator: (req) => [req.ip, `user:${req.user.id}`],
    store: createMemoryStore(Date.now),
  });

  assert.equal((await invoke(limiter, { ip: "192.0.2.1", user: { id: "a" } })).continued, true);
  assert.equal((await invoke(limiter, { ip: "192.0.2.1", user: { id: "b" } })).statusCode, 429);
  assert.equal((await invoke(limiter, { ip: "192.0.2.2", user: { id: "a" } })).statusCode, 429);
});
