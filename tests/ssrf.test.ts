import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIP, validateSafeUrl } from '@/lib/security/ssrf';

describe('SSRF Protection', () => {
  it('correctly identifies private and reserved IP addresses', () => {
    expect(isPrivateOrReservedIP('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIP('127.0.0.2')).toBe(true);
    expect(isPrivateOrReservedIP('10.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIP('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIP('172.31.255.254')).toBe(true);
    expect(isPrivateOrReservedIP('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIP('169.254.169.254')).toBe(true);
    expect(isPrivateOrReservedIP('::1')).toBe(true);

    // Public IPs should not be blocked
    expect(isPrivateOrReservedIP('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedIP('1.1.1.1')).toBe(false);
  });

  it('rejects forbidden schemes', async () => {
    await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow();
    await expect(validateSafeUrl('javascript:alert(1)')).rejects.toThrow();
    await expect(validateSafeUrl('ftp://example.com/file')).rejects.toThrow();
  });

  it('rejects local hostnames and private IPs', async () => {
    await expect(validateSafeUrl('http://localhost/audio.mp3')).rejects.toThrow();
    await expect(validateSafeUrl('http://127.0.0.1/test')).rejects.toThrow();
    await expect(validateSafeUrl('http://192.168.1.50/stream')).rejects.toThrow();
    await expect(validateSafeUrl('http://app.internal/secret')).rejects.toThrow();
  });

  it('allows safe public URLs', async () => {
    const url = await validateSafeUrl('https://example.com/audio.mp3');
    expect(url.hostname).toBe('example.com');
  });
});
