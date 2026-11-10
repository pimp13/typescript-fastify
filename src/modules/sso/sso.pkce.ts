import { createHash, randomBytes } from 'node:crypto';

export function randomUrlSafe(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function createPkcePair(): { verifier: string; challenge: string; method: 'S256' } {
  const verifier = randomUrlSafe(32);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge, method: 'S256' };
}
