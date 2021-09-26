import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { signAccessToken } from '../src/services/tokenService';
import { app, createUser, resetDatabase, TEST_PASSWORD } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/register', () => {
  it('creates a viewer account, hashes the password and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grace Hopper', email: '  Grace@Example.COM ', password: 'correct-horse' });

    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      role: 'VIEWER',
    });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'grace@example.com' } });
    expect(stored.passwordHash).not.toBe('correct-horse');
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('ignores attempts to self-assign a role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mallory', email: 'mallory@example.com', password: 'password123', role: 'ADMIN' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('VIEWER');
  });

  it('rejects a duplicate email with 409', async () => {
    await createUser('VIEWER', { email: 'taken@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Someone', email: 'TAKEN@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { message: 'An account with this email already exists' } });
  });

  it('rejects invalid input with 400 and field details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'email',
      'name',
      'password',
    ]);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token for valid credentials and records a USER_LOGIN event', async () => {
    const { user } = await createUser('ADMIN', { email: 'ada@example.com', name: 'Ada' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ADA@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, role: 'ADMIN' });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');

    const events = await prisma.event.findMany({ where: { type: 'USER_LOGIN' } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ userId: user.id, message: 'Ada signed in' });
  });

  it('uses the same 401 response for a wrong password and an unknown email', async () => {
    await createUser('VIEWER', { email: 'known@example.com' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'wrong-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(await prisma.event.count()).toBe(0);
  });

  it('rate limits repeated attempts', async () => {
    const limitedApp = createApp({ authRateLimitMax: 2 });
    const attempt = () =>
      request(limitedApp).post('/api/auth/login').send({ email: 'x@example.com', password: 'nope' });

    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.message).toMatch(/too many attempts/i);
  });
});

describe('GET /api/auth/me (authentication middleware)', () => {
  it('returns the current user for a valid token', async () => {
    const { user, auth } = await createUser('VIEWER');

    const res = await request(app).get('/api/auth/me').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, email: user.email });
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { message: 'Authentication required' } });
  });

  it.each([
    ['a malformed token', 'Bearer not-a-jwt'],
    ['a token signed with another secret', `Bearer ${jwt.sign({}, 'x'.repeat(40), { subject: 'abc' })}`],
    ['a non-bearer scheme', 'Basic dXNlcjpwYXNz'],
  ])('returns 401 for %s', async (_label, header) => {
    const res = await request(app).get('/api/auth/me').set('Authorization', header);
    expect(res.status).toBe(401);
  });

  it('returns 401 for a valid token whose user no longer exists', async () => {
    const { user } = await createUser('VIEWER');
    const token = signAccessToken(user.id);
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
