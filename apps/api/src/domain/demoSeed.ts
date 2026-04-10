import {
  adjustItemStock,
  conductCycleCount,
  createItem,
  listItems,
  pickItemStock,
  receiveItemStock,
} from "./item";

type SeedResult = {
  seeded: boolean;
  itemCount: number;
};

function isDemoSeedEnabled(): boolean {
  const value = process.env.OPSLY_SEED_DEMO_DATA?.trim().toLowerCase();

  return value === "1" || value === "true" || value === "yes";
}

export async function seedDemoDataIfEnabled(): Promise<SeedResult> {
  if (!isDemoSeedEnabled()) {
    return { seeded: false, itemCount: 0 };
  }

  const existingItems = await listItems();

  if (existingItems.length > 0) {
    return { seeded: false, itemCount: existingItems.length };
  }

  const cartons = await createItem({
    sku: "CTN-18X12X10",
    name: "Corrugated carton 18x12x10",
    unit: "each",
    quantityOnHand: 28,
    reorderThreshold: 40,
  });

  await pickItemStock({
    itemId: cartons.id,
    quantityPicked: 6,
    orderReference: "SO-24018",
    performedBy: "picker_a",
    note: "Wave pick for outbound parcel orders.",
  });

  const tape = await createItem({
    sku: "TAPE-48CLR",
    name: "48mm clear carton tape",
    unit: "roll",
    quantityOnHand: 52,
    reorderThreshold: 24,
  });

  await receiveItemStock({
    itemId: tape.id,
    quantityReceived: 24,
    supplierReference: "ASN-48291",
    performedBy: "receiver_1",
    note: "Morning replenishment from packaging supplier.",
  });

  await pickItemStock({
    itemId: tape.id,
    quantityPicked: 9,
    orderReference: "SO-24022",
    performedBy: "picker_b",
  });

  const mailers = await createItem({
    sku: "MAILER-POLY-M",
    name: "Medium poly mailer",
    unit: "pack",
    quantityOnHand: 7,
    reorderThreshold: 12,
  });

  await adjustItemStock({
    itemId: mailers.id,
    delta: -2,
    reasonCode: "DAMAGE",
    performedBy: "shift_lead",
    note: "Damaged packs pulled from the line-side rack.",
  });

  const labels = await createItem({
    sku: "LBL-4X6-THERM",
    name: "4x6 thermal shipping labels",
    unit: "roll",
    quantityOnHand: 3,
    reorderThreshold: 8,
  });

  await pickItemStock({
    itemId: labels.id,
    quantityPicked: 3,
    orderReference: "SO-24025",
    performedBy: "picker_c",
    note: "Label stock consumed on late outbound wave.",
  });

  const strapping = await createItem({
    sku: "STRAP-PET-16MM",
    name: "16mm PET strapping",
    unit: "roll",
    quantityOnHand: 31,
    reorderThreshold: 10,
  });

  await adjustItemStock({
    itemId: strapping.id,
    delta: -4,
    reasonCode: "MANUAL_CORRECTION",
    performedBy: "inventory_control",
    note: "Bin count did not match handheld quantity.",
  });

  await adjustItemStock({
    itemId: strapping.id,
    delta: -3,
    reasonCode: "DAMAGE",
    performedBy: "inventory_control",
    note: "Broken wrap on lower pallet position.",
  });

  await conductCycleCount({
    itemId: strapping.id,
    countedQuantity: 22,
    performedBy: "inventory_control",
    note: "Cycle count confirmed recurring mismatch in aisle C2.",
  });

  const seededItems = await listItems();

  return {
    seeded: true,
    itemCount: seededItems.length,
  };
}
