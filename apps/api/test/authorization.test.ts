import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };

describe("authorization", () => {
  const previousAdminToken = process.env.OPSLY_ADMIN_TOKEN;
  const previousViewerToken = process.env.OPSLY_VIEWER_TOKEN;
  const previousAuthMode = process.env.OPSLY_AUTH_MODE;

  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
    process.env.OPSLY_ADMIN_TOKEN = "test-admin-token";
    process.env.OPSLY_VIEWER_TOKEN = "test-viewer-token";
    process.env.OPSLY_AUTH_MODE = "role-header";
  });

  afterEach(() => {
    process.env.OPSLY_ADMIN_TOKEN = previousAdminToken;
    process.env.OPSLY_VIEWER_TOKEN = previousViewerToken;
    process.env.OPSLY_AUTH_MODE = previousAuthMode;
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

  it("blocks the item audit endpoint for viewer role", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-AUTH-550",
      name: "Audit access item",
      unit: "each",
      quantityOnHand: 4,
    });

    const itemId = itemResponse.body.id;

    const auditResponse = await request(app).get(`/items/${itemId}/audit`);

    expect(auditResponse.status).toBe(403);
    expect(auditResponse.body).toEqual({
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

  it("uses bearer-only mode by default when OPSLY_AUTH_MODE is unset", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    delete process.env.OPSLY_AUTH_MODE;
    process.env.NODE_ENV = "production";
    const app = createApp();

    const response = await request(app).post("/items").set("x-opsly-role", "admin").send({
      sku: "SKU-AUTH-700",
      name: "Default bearer-only mode item",
      unit: "each",
      quantityOnHand: 1,
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "AUTH_MODE_RESTRICTS_ROLE_HEADER",
        message: "x-opsly-role is disabled in bearer-only mode.",
      },
    });

    process.env.NODE_ENV = previousNodeEnv;
  });

  it("allows write endpoints in bearer-only mode with a valid bearer token", async () => {
    process.env.OPSLY_AUTH_MODE = "bearer-only";
    const app = createApp();

    const response = await request(app)
      .post("/items")
      .set("authorization", "Bearer test-admin-token")
      .send({
        sku: "SKU-AUTH-800",
        name: "Bearer-only mode item",
        unit: "each",
        quantityOnHand: 1,
      });

    expect(response.status).toBe(201);
    expect(response.headers["x-opsly-role"]).toBe("admin");
    expect(response.headers["x-opsly-auth-source"]).toBe("bearer");
  });

  it("allows sensitive read endpoints in bearer-only mode with a valid admin bearer token", async () => {
    process.env.OPSLY_AUTH_MODE = "bearer-only";
    const app = createApp();

    const itemResponse = await request(app)
      .post("/items")
      .set("authorization", "Bearer test-admin-token")
      .send({
        sku: "SKU-AUTH-850",
        name: "Bearer audit item",
        unit: "each",
        quantityOnHand: 5,
      });

    const itemId = itemResponse.body.id;

    const [dashboardResponse, investigationsResponse, auditResponse] = await Promise.all([
      request(app)
        .get("/dashboard/operations-summary")
        .set("authorization", "Bearer test-admin-token"),
      request(app)
        .get("/investigations/inventory-mismatch")
        .set("authorization", "Bearer test-admin-token"),
      request(app).get(`/items/${itemId}/audit`).set("authorization", "Bearer test-admin-token"),
    ]);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.headers["x-opsly-role"]).toBe("admin");
    expect(dashboardResponse.headers["x-opsly-auth-source"]).toBe("bearer");

    expect(investigationsResponse.status).toBe(200);
    expect(investigationsResponse.headers["x-opsly-role"]).toBe("admin");
    expect(investigationsResponse.headers["x-opsly-auth-source"]).toBe("bearer");

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.headers["x-opsly-role"]).toBe("admin");
    expect(auditResponse.headers["x-opsly-auth-source"]).toBe("bearer");
  });

  it("blocks sensitive read endpoints in bearer-only mode for a viewer bearer token", async () => {
    process.env.OPSLY_AUTH_MODE = "bearer-only";
    const app = createApp();

    const itemResponse = await request(app)
      .post("/items")
      .set("authorization", "Bearer test-admin-token")
      .send({
        sku: "SKU-AUTH-900",
        name: "Viewer bearer restricted item",
        unit: "each",
        quantityOnHand: 3,
      });

    const itemId = itemResponse.body.id;

    const [dashboardResponse, investigationsResponse, auditResponse] = await Promise.all([
      request(app)
        .get("/dashboard/operations-summary")
        .set("authorization", "Bearer test-viewer-token"),
      request(app)
        .get("/investigations/inventory-mismatch")
        .set("authorization", "Bearer test-viewer-token"),
      request(app).get(`/items/${itemId}/audit`).set("authorization", "Bearer test-viewer-token"),
    ]);

    for (const response of [dashboardResponse, investigationsResponse, auditResponse]) {
      expect(response.status).toBe(403);
      expect(response.headers["x-opsly-role"]).toBe("viewer");
      expect(response.headers["x-opsly-auth-source"]).toBe("bearer");
      expect(response.body).toEqual({
        error: {
          code: "FORBIDDEN",
          message: "Admin role is required for this operation.",
        },
      });
    }
  });
});
