import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { createApp } from '../src/server.js';

describe('GET /health', () => {
  it('returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
