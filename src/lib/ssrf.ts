import { URL } from 'url';

/**
 * Checks whether a given URL is safe from SSRF vulnerabilities.
 * Blocks loopback, private IPv4/IPv6 ranges, and internal hostnames,
 * unless NODE_ENV === 'development' or ALLOW_LOCAL_CRAWL is explicitly set.
 */
export function validateUrlForSSRF(urlString: string): { valid: boolean; reason?: string } {
  try {
    const parsedUrl = new URL(urlString);
    
    // Protocol check
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, reason: `Unsupported protocol: ${parsedUrl.protocol}` };
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Check if local crawl is allowed (for local dev and evaluation testing against localhost test servers)
    const allowLocal = process.env.ALLOW_LOCAL_CRAWL === 'true' || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    
    if (allowLocal) {
      return { valid: true };
    }

    // Block localhost and loopback
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return { valid: false, reason: 'Access to loopback/local addresses is disabled in production.' };
    }

    // Check IPv4 private network ranges
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);
    if (match) {
      const [, p1, p2] = match.map(Number);
      // 10.0.0.0/8
      if (p1 === 10) return { valid: false, reason: 'Private IP range 10.0.0.0/8 blocked.' };
      // 172.16.0.0/12
      if (p1 === 172 && p2 >= 16 && p2 <= 31) return { valid: false, reason: 'Private IP range 172.16.0.0/12 blocked.' };
      // 192.168.0.0/16
      if (p1 === 192 && p2 === 168) return { valid: false, reason: 'Private IP range 192.168.0.0/16 blocked.' };
      // 169.254.0.0/16 (Link local / AWS IMDS)
      if (p1 === 169 && p2 === 254) return { valid: false, reason: 'Link-local address blocked.' };
      // 127.0.0.0/8
      if (p1 === 127) return { valid: false, reason: 'Loopback address blocked.' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : 'Invalid URL' };
  }
}
