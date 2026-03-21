import request from 'supertest';
import { app } from '../../src/app'; // Adjust the path as necessary

describe('API Integration Tests', () => {
    it('should return 200 for the root endpoint', async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(200);
    });

    it('should create a new item', async () => {
        const newItem = {
            name: 'Test Item',
            description: 'This is a test item',
        };

        const response = await request(app).post('/api/items').send(newItem);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newItem.name);
    });

    it('should retrieve an item by ID', async () => {
        const itemId = 1; // Replace with a valid item ID
        const response = await request(app).get(`/api/items/${itemId}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', itemId);
    });

    it('should update an existing item', async () => {
        const itemId = 1; // Replace with a valid item ID
        const updatedItem = {
            name: 'Updated Item',
            description: 'This is an updated test item',
        };

        const response = await request(app).put(`/api/items/${itemId}`).send(updatedItem);
        expect(response.status).toBe(200);
        expect(response.body.name).toBe(updatedItem.name);
    });

    it('should delete an item', async () => {
        const itemId = 1; // Replace with a valid item ID
        const response = await request(app).delete(`/api/items/${itemId}`);
        expect(response.status).toBe(204);
    });
});