import { describe, expect, it } from 'vitest';
import worker, {
  checkRateLimit,
  isBlockedAddress,
  isPrivateIPv4,
  parseIPv4,
  validateTarget,
} from '../../worker/src/index';

describe('IPv4 classification', () => {
  it('parses dotted quads', () => {
    expect(parseIPv4('192.168.1.1')).toEqual([192, 168, 1, 1]);
    expect(parseIPv4('1.2.3')).toBeNull();
    expect(parseIPv4('256.1.1.1')).toBeNull();
    expect(parseIPv4('1.2.3.4.5')).toBeNull();
    expect(parseIPv4('a.b.c.d')).toBeNull();
  });

  it('flags every private or reserved range', () => {
    const privates = [
      [0, 0, 0, 0],
      [10, 1, 2, 3],
      [127, 0, 0, 1],
      [169, 254, 169, 254],
      [172, 16, 0, 1],
      [172, 31, 255, 255],
      [192, 168, 0, 1],
      [100, 64, 0, 1],
      [198, 18, 0, 1],
      [224, 0, 0, 1],
      [255, 255, 255, 255],
    ];
    for (const octets of privates) {
      expect(isPrivateIPv4(octets), octets.join('.')).toBe(true);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const octets of [
      [8, 8, 8, 8],
      [1, 1, 1, 1],
      [93, 184, 216, 34],
      [172, 32, 0, 1],
      [192, 169, 0, 1],
    ]) {
      expect(isPrivateIPv4(octets), octets.join('.')).toBe(false);
    }
  });
});

describe('IPv6 classification', () => {
  it('flags loopback, ULA, link-local and mapped private addresses', () => {
    for (const ip of [
      '::1',
      '::',
      'fd00::1',
      'fc00::1',
      'fe80::1',
      'fe80::1%eth0',
      'ff02::1',
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '64:ff9b::1',
    ]) {
      expect(isBlockedAddress(ip), ip).toBe(true);
    }
  });

  it('allows public IPv6 addresses', () => {
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false);
    expect(isBlockedAddress('2a00:1450:4001:80f::200e')).toBe(false);
  });
});

describe('validateTarget', () => {
  it('accepts ordinary public http(s) URLs', () => {
    const ok = validateTarget('https://example.com/article?id=1');
    expect(ok.ok).toBe(true);
    expect(ok.url?.hostname).toBe('example.com');
  });

  it('refuses non-http schemes', () => {
    for (const url of [
      'file:///etc/passwd',
      'ftp://example.com/a',
      'javascript:alert(1)',
      'data:text/html,<h1>x</h1>',
      'gopher://example.com',
    ]) {
      expect(validateTarget(url).ok, url).toBe(false);
    }
  });

  it('refuses localhost, internal suffixes and metadata hosts', () => {
    for (const url of [
      'http://localhost:80/',
      'http://LOCALHOST/',
      'http://foo.local/',
      'http://db.internal/',
      'http://metadata.google.internal/computeMetadata/v1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://[fd00::1]/',
    ]) {
      const result = validateTarget(url);
      expect(result.ok, url).toBe(false);
      expect(result.error, url).toBeTruthy();
    }
  });

  it('refuses private and reserved IP literals', () => {
    for (const url of [
      'http://10.0.0.1/',
      'http://127.0.0.1/',
      'http://192.168.1.1/',
      'http://172.16.5.4/',
      'http://100.100.100.200/',
      'http://0.0.0.0/',
    ]) {
      expect(validateTarget(url).ok, url).toBe(false);
    }
  });

  it('refuses embedded credentials', () => {
    expect(validateTarget('https://user:pass@example.com/').ok).toBe(false);
  });

  it('refuses unusual ports', () => {
    expect(validateTarget('http://example.com:22/').ok).toBe(false);
    expect(validateTarget('http://example.com:3306/').ok).toBe(false);
    expect(validateTarget('https://example.com:8443/').ok).toBe(true);
  });

  it('refuses nonsense input', () => {
    expect(validateTarget('not a url').ok).toBe(false);
    expect(validateTarget('').ok).toBe(false);
  });
});

describe('rate limiting', () => {
  it('allows up to the limit inside the window, then refuses', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit(key, 3, 60, 1000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60, 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('resets after the window elapses', () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, 1, 60, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60, 1000).allowed).toBe(false);
    expect(checkRateLimit(key, 1, 60, 1000 + 61_000).allowed).toBe(true);
  });

  it('tracks clients independently', () => {
    expect(checkRateLimit('a', 1, 60, 1).allowed).toBe(true);
    expect(checkRateLimit('b', 1, 60, 1).allowed).toBe(true);
  });
});

describe('request handling', () => {
  const call = (init: RequestInit, env = {}) =>
    worker.fetch(new Request('https://metalens-fetch.example.workers.dev/fetch', init), env);

  it('answers CORS preflight', async () => {
    const res = await call({ method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*');
  });

  it('rejects GET', async () => {
    const res = await call({ method: 'GET' });
    expect(res.status).toBe(405);
  });

  it('rejects a body without a url', async () => {
    const res = await call({
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects private targets before any network access', async () => {
    const res = await call({
      method: 'POST',
      body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' }),
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
    });
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).toBeTruthy();
  });

  it('rejects an unknown path', async () => {
    const res = await worker.fetch(
      new Request('https://metalens-fetch.example.workers.dev/../secrets', { method: 'POST' }),
      {},
    );
    expect([404, 400]).toContain(res.status);
  });
});
