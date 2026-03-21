import { Router } from 'express';
import { z } from 'zod';
import { createItem, getItems } from '../data/items-memory-repo';
import { CreateItemInput } from '../domain/items';

const router = Router();

// Validation schema for creating an item
const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

// POST /items - Create a new item
router.post('/items', (req, res) => {
  const result = createItemSchema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({ errors: result.error.errors });
  }

  const itemData: CreateItemInput = result.data;
  const newItem = createItem(itemData);
  res.status(201).json(newItem);
});

// GET /items - Retrieve all items
router.get('/items', (req, res) => {
  const items = getItems();
  res.status(200).json(items);
});

export default router;