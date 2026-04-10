import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { clearItemStore, clearMovementStore } from "../src/data/store";
import { createApp } from "../src/index";

const ADMIN_HEADERS = { "x-opsly-role": "admin" };

describe("item creation", () => {
  beforeEach(() => {
    clearItemStore();
    clearMovementStore();
  });

  it("rejects creating two items with the same SKU", async () => {
    const app = createApp();

    const firstResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-C-100",
      name: "Case sealer",
      unit: "each",
      quantityOnHand: 1,
    });

    const secondResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "SKU-C-100",
      name: "Duplicate case sealer",
      unit: "each",
      quantityOnHand: 2,
    });

    const listResponse = await request(app).get("/items");

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body).toEqual({
      error: {
        code: "DUPLICATE_SKU",
        message: "An item with this SKU already exists.",
      },
    });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveLength(1);
  });

  it("treats SKU duplicates as the same even when casing or whitespace differs", async () => {
    const app = createApp();

    await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "sku-c-200",
      name: "Stretch wrap",
      unit: "roll",
      quantityOnHand: 4,
    });

    const duplicateResponse = await request(app).post("/items").set(ADMIN_HEADERS).send({
      sku: "  SKU-C-200  ",
      name: "Second stretch wrap",
      unit: "roll",
      quantityOnHand: 5,
    });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.code).toBe("DUPLICATE_SKU");
  });
});
