import { URL } from "url";
import dns from "dns/promises";

/**
 * Checks if an IP address is private, reserved, or loopback.
 * Covers RFC 1918 and other non-public ranges.
 */
export function isPrivateIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return true; // Block anything that's not standard IPv4 for now

    const octets = parts.map(part => {
        const n = Number(part);
        // Validate each part is a numeric integer within [0, 255]
        if (!part.trim() || isNaN(n) || !Number.isInteger(n) || n < 0 || n > 255) {
            return -1;
        }
        return n;
    });

    if (octets.some(o => o === -1)) return true; // Reject invalid formats

    const [a, b] = octets;

    return (
        a === 10 ||                           // 10.0.0.0/8
        (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
        (a === 192 && b === 168) ||           // 192.168.0.0/16
        a === 127 ||                          // 127.0.0.0/8
        a === 0 ||                             // 0.0.0.0/8
        (a === 169 && b === 254) ||           // 169.254.0.0/16 (Link-local)
        a >= 224                               // Multicast/Reserved
    );
}

export interface SafeUrlResult {
    url: string;
    resolvedIp: string;
}

/**
 * Validates a URL for SSRF prevention.
 * - Ensures scheme is http or https
 * - Resolves hostname and validates IP
 * - Blocks local/private IPs
 * - Returns resolved IP to prevent DNS rebinding
 */
export async function validateSafeUrl(urlStr: string): Promise<SafeUrlResult> {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("Invalid protocol");
        }

        const hostname = parsed.hostname;
        let resolvedIp = "";

        // If it's a raw IP, check it directly
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
            if (isPrivateIP(hostname)) {
                throw new Error("Access to private IP is forbidden");
            }
            resolvedIp = hostname;
        } else {
            let lookup;
            try {
                lookup = await dns.lookup(hostname);
            } catch (dnsErr) {
                throw new Error(`DNS lookup failed for ${hostname}: ${dnsErr instanceof Error ? dnsErr.message : "Unknown"}`, { cause: dnsErr });
            }

            // Perform private IP check OUTSIDE the lookup catch block
            if (isPrivateIP(lookup.address)) {
                throw new Error("Hostname resolves to a private IP");
            }
            resolvedIp = lookup.address;
        }

        return { url: urlStr, resolvedIp };
    } catch (err) {
        throw new Error(`SSRF Validation Failed: ${err instanceof Error ? err.message : "Unknown error"}`, { cause: err });
    }
}
