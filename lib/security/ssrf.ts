import { lookup } from 'node:dns/promises';

/**
 * Validates if an IP address is a private, loopback, or reserved address.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // IPv4 checks
  const ipv4Parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (ipv4Parts.length === 4 && ipv4Parts.every((p) => !Number.isNaN(p) && p >= 0 && p <= 255)) {
    const [b0, b1] = ipv4Parts;
    // 127.0.0.0/8 (Loopback)
    if (b0 === 127) return true;
    // 10.0.0.0/8 (Private)
    if (b0 === 10) return true;
    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (b0 === 192 && b1 === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (b0 === 169 && b1 === 254) return true;
    // 0.0.0.0/8 (Current network)
    if (b0 === 0) return true;
    // Broadcast
    if (ip === '255.255.255.255') return true;
    return false;
  }

  // IPv6 checks
  const normalizedIpv6 = ip.toLowerCase();
  if (normalizedIpv6 === '::1' || normalizedIpv6 === '::' || normalizedIpv6.startsWith('fe80:') || normalizedIpv6.startsWith('fc') || normalizedIpv6.startsWith('fd')) {
    return true;
  }

  return false;
}

/**
 * Validates a user-supplied URL against SSRF threats.
 * Throws an Error if the URL is dangerous or points to private infrastructure.
 */
export async function validateSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format');
  }

  // Only allow HTTP/HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are supported');
  }

  // Check port
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    throw new Error('Non-standard ports are prohibited');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Disallow localhost and domain aliases
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    throw new Error('Access to local hostnames is prohibited');
  }

  // If directly provided an IP literal
  if (isPrivateOrReservedIP(hostname)) {
    throw new Error('Access to private or reserved IP addresses is prohibited');
  }

  // Resolve hostname in server environment to prevent DNS rebinding
  try {
    const { address } = await lookup(hostname);
    if (isPrivateOrReservedIP(address)) {
      throw new Error('Host resolves to a private or reserved network address');
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('prohibited')) {
      throw err;
    }
    // DNS resolution failure
    throw new Error('Unable to resolve host domain');
  }

  return parsed;
}
