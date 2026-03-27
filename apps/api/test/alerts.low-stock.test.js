import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";
const ADMIN_HEADERS = { "x-opsly-role": "admin" };
describe("low stock alerts", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });
  it("returns items where quantityOnHand is below reorderThreshold", async () => {
    const app = createApp();
    await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-100",
      name: "Bubble wrap",
      unit: "roll",
      quantityOnHand: 3,
      reorderThreshold: 5,
    });
    await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-200",
      name: "Pallet corner",
      unit: "each",
      quantityOnHand: 8,
      reorderThreshold: 4,
    });
    const response = await request(app).get("/alerts/low-stock");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      sku: "SKU-A-100",
      quantityOnHand: 3,
      reorderThreshold: 5,
    });
  });
  it("includes items exactly at reorderThreshold", async () => {
    const app = createApp();
    await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-300",
      name: "Carton seal tape",
      unit: "roll",
      quantityOnHand: 10,
      reorderThreshold: 10,
    });
    const response = await request(app).get("/alerts/low-stock");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      sku: "SKU-A-300",
      quantityOnHand: 10,
      reorderThreshold: 10,
    });
  });
  it("excludes items without reorderThreshold", async () => {
    const app = createApp();
    await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-400",
      name: "Forklift battery water",
      unit: "bottle",
      quantityOnHand: 0,
    });
    const response = await request(app).get("/alerts/low-stock");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(0);
  });
  it("includes zero stock when threshold is configured", async () => {
    const app = createApp();
    await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-A-500",
      name: "Poly mailers",
      unit: "pack",
      quantityOnHand: 0,
      reorderThreshold: 2,
    });
    const response = await request(app).get("/alerts/low-stock");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      sku: "SKU-A-500",
      quantityOnHand: 0,
      reorderThreshold: 2,
    });
  });
});
