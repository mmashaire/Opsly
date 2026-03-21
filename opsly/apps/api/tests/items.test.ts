import request from 'supertest';
import { createApp } from '../app';
import { createItem, getItems } from '../data/items-memory-repo';

describe('Items API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    // Clear the in-memory store before each test
    // Assuming there's a way to reset the in-memory store
    // This could be a function like clearItems() that you would implement
  });

  it('should create a new item', async () => {
    const newItem = {
      name: 'Test Item',
      description: 'This is a test item',
    };

    const response = await request(app)
      .post('/items')
      .send(newItem)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(newItem.name);
    expect(response.body.description).toBe(newItem.description);
  });

  it('should retrieve all items', async () => {
    await createItem({ name: 'Item 1', description: 'First item' });
    await createItem({ name: 'Item 2', description: 'Second item' });

    const response = await request(app)
      .get('/items')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toHaveProperty('name', 'Item 1');
    expect(response.body[1]).toHaveProperty('name', 'Item 2');
  });

  it('should retrieve a specific item by ID', async () => {
    const createdItem = await createItem({ name: 'Item 1', description: 'First item' });

    const response = await request(app)
      .get(`/items/${createdItem.id}`)
      .expect(200);

    expect(response.body).toHaveProperty('id', createdItem.id);
    expect(response.body).toHaveProperty('name', 'Item 1');
  });
});