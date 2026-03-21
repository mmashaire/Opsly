export type Role = 'admin' | 'viewer';

export type Item = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateItemInput = {
  sku: string;
  name: string;
  unit: string;
  quantityOnHand: number;
};
