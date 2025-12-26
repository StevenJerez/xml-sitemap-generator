import { describe, it } from 'node:test';
import assert from 'node:assert';
import authService from '../services/auth.service.js';

describe('Auth Service', () => {
  it('should parse Basic Auth header correctly', () => {
    const username = 'admin';
    const password = 'secret123';
    const encoded = Buffer.from(`${username}:${password}`).toString('base64');
    const header = `Basic ${encoded}`;

    const credentials = authService.parseBasicAuth(header);

    assert.strictEqual(credentials.username, username);
    assert.strictEqual(credentials.password, password);
  });

  it('should return null for invalid Basic Auth header', () => {
    const result1 = authService.parseBasicAuth('Bearer token123');
    const result2 = authService.parseBasicAuth('');
    const result3 = authService.parseBasicAuth(null);

    assert.strictEqual(result1, null);
    assert.strictEqual(result2, null);
    assert.strictEqual(result3, null);
  });

  it('should parse Bearer token correctly', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const header = `Bearer ${token}`;

    const result = authService.parseBearerToken(header);

    assert.strictEqual(result, token);
  });

  it('should generate and verify JWT tokens', () => {
    const username = 'testuser';
    const token = authService.generateToken(username);

    assert.ok(token, 'Token should be generated');
    assert.strictEqual(typeof token, 'string');

    const decoded = authService.verifyToken(token);

    assert.ok(decoded, 'Token should be valid');
    assert.strictEqual(decoded.username, username);
  });

  it('should reject invalid JWT tokens', () => {
    const invalidToken = 'invalid.token.here';
    const result = authService.verifyToken(invalidToken);

    assert.strictEqual(result, null);
  });
});
