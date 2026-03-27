import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";
describe("authorization", () => {
  const previousAdminToken = process.env.OPSLY_ADMIN_TOKEN;
  const previousViewerToken = process.env.OPSLY_VIEWER_TOKEN;
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
    process.env.OPSLY_ADMIN_TOKEN = "test-admin-token";
    process.env.OPSLY_VIEWER_TOKEN = "test-viewer-token";
  });
  afterEach(() => {
    process.env.OPSLY_ADMIN_TOKEN = previousAdminToken;
    process.env.OPSLY_VIEWER_TOKEN = previousViewerToken;
  });
  it("blocks write endpoints for viewer role", async () => {
    const app = createApp();
    const response = await request(app).post("/items").send({
      sku: "SKU-AUTH-100",
      name: "Auth test item",
      unit: "each",
      quantityOnHand: 1,
    });
    expect(response.status).toBe(403);
    expect(response.headers["x-opsly-role"]).toBe("viewer");
    expect(response.headers["x-opsly-auth-source"]).toBe("default");
    expect(response.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Admin role is required for this operation.",
      },
    });
  });
  it("allows write endpoints for admin role", async () => {
    const app = createApp();
    const response = await request(app).post("/items").set("x-opsly-role", "admin").send({
      sku: "SKU-AUTH-200",
      name: "Admin test item",
      unit: "each",
      quantityOnHand: 1,
    });
    expect(response.status).toBe(201);
    expect(response.headers["x-opsly-role"]).toBe("admin");
    expect(response.headers["x-opsly-auth-source"]).toBe("header");
    expect(response.body).toMatchObject({
      sku: "SKU-AUTH-200",
    });
  });
  it("returns 400 for invalid role header", async () => {
    const app = createApp();
    const response = await request(app).get("/health").set("x-opsly-role", "manager");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_ROLE",
        message: "Invalid role header. Allowed roles: admin, viewer.",
      },
    });
  });
  it("allows write endpoints with valid admin bearer token", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/items")
      .set("authorization", "Bearer test-admin-token")
      .send({
        sku: "SKU-AUTH-300",
        name: "Bearer admin item",
        unit: "each",
        quantityOnHand: 2,
      });
    expect(response.status).toBe(201);
    expect(response.headers["x-opsly-role"]).toBe("admin");
    expect(response.headers["x-opsly-auth-source"]).toBe("bearer");
  });
  it("prioritizes bearer token role over x-opsly-role header", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/items")
      .set("authorization", "Bearer test-admin-token")
      .set("x-opsly-role", "viewer")
      .send({
        sku: "SKU-AUTH-350",
        name: "Bearer precedence item",
        unit: "each",
        quantityOnHand: 2,
      });
    expect(response.status).toBe(201);
    expect(response.headers["x-opsly-role"]).toBe("admin");
    expect(response.headers["x-opsly-auth-source"]).toBe("bearer");
  });
  it("returns 401 for invalid bearer token", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/items")
      .set("authorization", "Bearer not-valid")
      .send({
        sku: "SKU-AUTH-400",
        name: "Invalid bearer item",
        unit: "each",
        quantityOnHand: 1,
      });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid bearer token.",
      },
    });
  });
  it("returns 401 for malformed authorization header", async () => {
    const app = createApp();
    const response = await request(app).post("/items").set("authorization", "Token abc").send({
      sku: "SKU-AUTH-500",
      name: "Malformed auth",
      unit: "each",
      quantityOnHand: 1,
    });
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_TOKEN",
        message: "Authorization header must use Bearer token format.",
      },
    });
  });
  it("blocks sensitive read endpoints for viewer role", async () => {
    const app = createApp();
    const investigationsResponse = await request(app).get("/investigations/inventory-mismatch");
    const dashboardResponse = await request(app).get("/dashboard/operations-summary");
    expect(investigationsResponse.status).toBe(403);
    expect(investigationsResponse.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Admin role is required for this operation.",
      },
    });
    expect(dashboardResponse.status).toBe(403);
    expect(dashboardResponse.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Admin role is required for this operation.",
      },
    });
  });
  it("keeps low-stock alerts readable by viewer role", async () => {
    const app = createApp();
    await request(app).post("/items").set("x-opsly-role", "admin").send({
      sku: "SKU-AUTH-600",
      name: "Viewer visibility item",
      unit: "each",
      quantityOnHand: 1,
      reorderThreshold: 2,
    });
    const response = await request(app).get("/alerts/low-stock");
    expect(response.status).toBe(200);
    expect(response.headers["x-opsly-role"]).toBe("viewer");
    expect(response.body).toHaveLength(1);
  });
});
