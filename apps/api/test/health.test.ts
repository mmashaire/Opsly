import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/index";

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
});
