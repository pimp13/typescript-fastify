import { createHash, randomBytes } from 'node:crypto';
import { extname } from 'node:path';

const IP_SALT = process.env.BAN_IP_SALT ?? 'funlife-chan-salt';

export function hashIp(ip: string) {
  return createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex');
}

export function parsePosterName(raw?: string) {
  const value = (raw ?? '').trim();
  if (!value) {
    return { name: 'Anonymous', tripcode: null as string | null, isSage: false };
  }

  const hashIndex = value.indexOf('#');
  if (hashIndex === -1) {
    return {
      name: value.slice(0, 48) || 'Anonymous',
      tripcode: null as string | null,
      isSage: value.toLowerCase() === 'sage',
    };
  }

  const name = value.slice(0, hashIndex).trim() || 'Anonymous';
  const secret = value.slice(hashIndex + 1);
  const tripcode = createHash('sha1')
    .update(secret)
    .digest('base64url')
    .slice(0, 10);

  return {
    name: name.slice(0, 48),
    tripcode,
    isSage: name.toLowerCase() === 'sage',
  };
}

export function isSageEmail(email?: string) {
  return (email ?? '').trim().toLowerCase() === 'sage';
}

export function createUploadFilename(originalName: string) {
  const extension = extname(originalName).toLowerCase() || '.bin';
  return `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`;
}

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
