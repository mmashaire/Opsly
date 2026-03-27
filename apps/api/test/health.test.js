import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/index";
const previousAllowedOrigins = process.env.OPSLY_ALLOWED_ORIGINS;
afterEach(() => {
  process.env.OPSLY_ALLOWED_ORIGINS = previousAllowedOrigins;
});
describe("GET /health", () => {
  it("returns ok", async () => {
    const app = createApp();
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["x-request-id"]).toBeTypeOf("string");
    expect(response.headers["x-request-id"].length).toBeGreaterThan(0);
  });
  it("uses incoming x-request-id when provided", async () => {
    const app = createApp();
    const response = await request(app).get("/health").set("x-request-id", "req-123");
    expect(response.status).toBe(200);
    expect(response.headers["x-request-id"]).toBe("req-123");
  });
  it("returns CORS headers for an allowed browser origin", async () => {
    process.env.OPSLY_ALLOWED_ORIGINS = "http://localhost:5173";
    const app = createApp();
    const response = await request(app).get("/health").set("origin", "http://localhost:5173");
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers.vary).toContain("Origin");
  });
  it("rejects requests from disallowed browser origins", async () => {
    process.env.OPSLY_ALLOWED_ORIGINS = "http://localhost:5173";
    const app = createApp();
    const response = await request(app).get("/health").set("origin", "http://malicious.example");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: "CORS_ORIGIN_FORBIDDEN",
        message: "Request origin is not allowed.",
      },
    });
  });
});
