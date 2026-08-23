/**
 * Cryptographic Utility for SHA-256 Hashing & Blockchain Verification
 * Uses native Web Crypto API (SubtleCrypto) for high-performance, real cryptographic hashing.
 */

export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 for Public Ledger Block
 * Payload structure: prev_hash + block_index + site_domain + cookie_hash + verification_result + consent_action + timestamp
 */
export async function computePublicBlockHash(
  prevHash: string,
  blockIndex: number,
  siteDomain: string,
  cookieHash: string,
  verificationResult: string,
  consentAction: string,
  timestamp: string
): Promise<string> {
  const payload = `${prevHash}|${blockIndex}|${siteDomain}|${cookieHash}|${verificationResult}|${consentAction}|${timestamp}`;
  return await sha256(payload);
}

/**
 * Compute SHA-256 for Private Ledger Block
 * Payload structure: prev_hash + block_index + userId + cookieEventId + consentAction + auditOutput + timestamp
 */
export async function computePrivateBlockHash(
  prevHash: string,
  blockIndex: number,
  userId: string,
  cookieEventId: string,
  consentAction: string,
  auditOutput: string,
  timestamp: string
): Promise<string> {
  const payload = `${prevHash}|${blockIndex}|${userId}|${cookieEventId}|${consentAction}|${auditOutput}|${timestamp}`;
  return await sha256(payload);
}

/**
 * Truncate a 64-char hex hash for compact UI display while keeping full hash in title/tooltip
 */
export function truncateHash(hash: string, startChars: number = 8, endChars: number = 6): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars + 3) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}
