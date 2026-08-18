import { describe, expect, it } from 'vitest';
import { computeStationTokenHash, generateStationToken } from '../src/modules/cricket/stationTokenCrypto';

describe('station bearer token cryptography', () => {
  it('creates opaque, URL-safe 256-bit tokens with no embedded identifiers', () => {
    const token = generateStationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).not.toContain('session');
    expect(token).not.toContain('resource');
  });

  it('creates a different token for every invitation', () => {
    expect(generateStationToken()).not.toBe(generateStationToken());
  });

  it('hashes a token deterministically and makes tampering fail lookup', async () => {
    const token = generateStationToken();
    const hash = await computeStationTokenHash(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await computeStationTokenHash(token)).toBe(hash);
    expect(await computeStationTokenHash(`${token.slice(0, -1)}A`)).not.toBe(hash);
  });

  it('rejects an empty token', async () => {
    await expect(computeStationTokenHash('')).rejects.toThrow();
  });
});
