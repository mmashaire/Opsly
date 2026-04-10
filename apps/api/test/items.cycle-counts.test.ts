import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };
const VIEWER_HEADERS = { "x-opsly-role": "viewer" };

describe("cycle counts", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("records a count that reveals shrinkage (negative variance)", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-001",
      name: "Packing tape",
      unit: "roll",
      quantityOnHand: 20,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({
        countedQuantity: 17,
        note: "Counted aisle B3.",
        performedBy: "warehouse_op",
      });

    expect(countResponse.status).toBe(200);
    expect(countResponse.body.item.quantityOnHand).toBe(17);
    expect(countResponse.body.variance).toEqual({
      delta: -3,
      countedQuantity: 17,
      previousQuantity: 20,
    });
    expect(countResponse.body.movement).toMatchObject({
      itemId,
      type: "ADJUSTMENT",
      delta: -3,
      quantityBefore: 20,
      quantityAfter: 17,
      reasonCode: "CYCLE_COUNT",
      note: "Counted aisle B3.",
      performedBy: "warehouse_op",
    });
  });

  it("records a count that reveals surplus (positive variance)", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-002",
      name: "Bubble wrap",
      unit: "m",
      quantityOnHand: 50,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 53 });

    expect(countResponse.status).toBe(200);
    expect(countResponse.body.item.quantityOnHand).toBe(53);
    expect(countResponse.body.variance).toEqual({
      delta: 3,
      countedQuantity: 53,
      previousQuantity: 50,
    });
    expect(countResponse.body.movement.reasonCode).toBe("CYCLE_COUNT");
  });

  it("records a zero-variance count and writes a movement for the audit trail", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-003",
      name: "Shrink wrap",
      unit: "roll",
      quantityOnHand: 10,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 10 });

    expect(countResponse.status).toBe(200);
    expect(countResponse.body.item.quantityOnHand).toBe(10);
    expect(countResponse.body.variance).toEqual({
      delta: 0,
      countedQuantity: 10,
      previousQuantity: 10,
    });

    // A zero-variance count should still appear in movement history.
    const movementResponse = await request(app).get(`/items/${itemId}/movements`);
    expect(movementResponse.status).toBe(200);
    expect(movementResponse.body).toHaveLength(1);
    expect(movementResponse.body[0]).toMatchObject({
      type: "ADJUSTMENT",
      reasonCode: "CYCLE_COUNT",
      delta: 0,
    });
  });

  it("records a count that brings stock to zero", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-004",
      name: "Labels",
      unit: "sheet",
      quantityOnHand: 8,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 0 });

    expect(countResponse.status).toBe(200);
    expect(countResponse.body.item.quantityOnHand).toBe(0);
    expect(countResponse.body.variance.delta).toBe(-8);
  });

  it("returns 404 when the item does not exist", async () => {
    const app = createApp();

    const countResponse = await request(app)
      .post("/items/nonexistent/cycle-counts")
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: 5 });

    expect(countResponse.status).toBe(404);
    expect(countResponse.body).toEqual({
      error: {
        code: "ITEM_NOT_FOUND",
        message: "Item not found.",
      },
    });
  });

  it("returns 403 when a viewer attempts a cycle count", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-005",
      name: "Cardboard box",
      unit: "each",
      quantityOnHand: 30,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(VIEWER_HEADERS)
      .send({ countedQuantity: 28 });

    expect(countResponse.status).toBe(403);
  });

  it("returns 400 for missing countedQuantity", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-006",
      name: "Strapping",
      unit: "m",
      quantityOnHand: 15,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ note: "Missing the required field." });

    expect(countResponse.status).toBe(400);
    expect(countResponse.body.error.code).toBe("INVALID_REQUEST");
  });

  it("returns 400 for negative countedQuantity", async () => {
    const app = createApp();

    const itemResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-CC-007",
      name: "Tape gun",
      unit: "each",
      quantityOnHand: 5,
    });

    const itemId = itemResponse.body.id;

    const countResponse = await request(app)
      .post(`/items/${itemId}/cycle-counts`)
      .set(ADMIN_HEADERS)
      .send({ countedQuantity: -1 });

    expect(countResponse.status).toBe(400);
    expect(countResponse.body.error.code).toBe("INVALID_REQUEST");
  });
});
