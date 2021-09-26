import request from 'supertest';
import { prisma } from '../src/db/prisma';
import { app } from './helpers';

afterAll(() => prisma.$disconnect());

describe('error responses', () => {
  it('returns 404 in the standard shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Route GET /api/does-not-exist not found' } });
  });

  it('returns 400 for malformed JSON without leaking parser internals', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { message: 'Malformed JSON body' } });
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a'.repeat(200_000), password: 'x' });
    expect(res.status).toBe(413);
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('only allows the configured CORS origin', async () => {
    const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    const denied = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
