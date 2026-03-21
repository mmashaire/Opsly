import type { Item } from "@opsly/shared";

const items: Item[] = [];

export function addItem(item: Item) {
  items.push(item);
}

export function getItems(): Item[] {
  return items;
}
