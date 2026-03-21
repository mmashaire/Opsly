import request from 'supertest';
import { createApp } from '../src/app';

describe('Health Endpoint', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  it('should return a 200 status and a health message', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});