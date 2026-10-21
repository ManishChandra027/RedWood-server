import assert from "node:assert/strict";
import test from "node:test";

import { validateEnvironment } from "../src/config/env.js";
import { requestLogger, writeLog } from "../src/utils/logger.js";

const validEnv = () => ({
  MONGO_URL: "mongodb://localhost:27017",
  ACCESS_TOKEN_SECRET: "a".repeat(40),
  REFRESH_TOKEN_SECRET: "b".repeat(40),
  ACCESS_TOKEN_EXPIRES_IN: "15m",
  REFRESH_TOKEN_EXPIRES_IN: "7d",
  CORS_ORIGIN: "http://localhost:5173,https://store.example.com",
  CLIENT_URL: "https://store.example.com",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_USER: "test-user",
  SMTP_PASS: "test-password",
  SMTP_FROM: "store@example.com",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
  PORT: "8080",
  TRUST_PROXY_HOPS: "1",
});

test("environment validator accepts production-shaped settings and rejects unsafe config", () => {
  const result = validateEnvironment(validEnv());
  assert.equal(result.port, 8080);
  assert.deepEqual(result.origins, ["http://localhost:5173", "https://store.example.com"]);

  const sameSecret = validEnv();
  sameSecret.NODE_ENV = "production";
  sameSecret.REFRESH_TOKEN_SECRET = sameSecret.ACCESS_TOKEN_SECRET;
  assert.throws(() => validateEnvironment(sameSecret), /must be different/i);

  const badOrigin = validEnv();
  badOrigin.CORS_ORIGIN = "*";
  assert.throws(() => validateEnvironment(badOrigin), /HTTP\(S\) origins/i);

  const missingMail = validEnv();
  delete missingMail.SMTP_PASS;
  assert.throws(() => validateEnvironment(missingMail), /SMTP_PASS/);
});

test("structured logs omit sensitive and unapproved fields", () => {
  const originalLog = console.log;
  let output = "";
  console.log = (line) => {
    output = line;
  };
  try {
    writeLog("info", "test.event", {
      requestId: "request-1",
      path: "/api/v1/auth/login",
      password: "do-not-log-this-password",
      token: "do-not-log-this-token",
      otp: "123456",
      body: { email: "private@example.com" },
    });
  } finally {
    console.log = originalLog;
  }

  assert.match(output, /request-1/);
  assert.doesNotMatch(output, /do-not-log-this|123456|private@example.com|password|token|otp/i);
});

test("request logs use route templates instead of user-supplied path values", () => {
  const originalLog = console.log;
  let output = "";
  let onFinish;
  const response = {
    statusCode: 200,
    setHeader() {},
    once(_event, callback) { onFinish = callback; },
  };
  const request = {
    method: "GET",
    path: "/api/v1/orders/private-order-id",
    baseUrl: "/api/v1/orders",
    route: { path: "/:orderId" },
  };
  console.log = (line) => {
    output = line;
  };
  try {
    requestLogger(request, response, () => {});
    onFinish();
  } finally {
    console.log = originalLog;
  }

  assert.match(output, /\/api\/v1\/orders\/:orderId/);
  assert.doesNotMatch(output, /private-order-id/);
  assert.ok(request.requestId);
});
