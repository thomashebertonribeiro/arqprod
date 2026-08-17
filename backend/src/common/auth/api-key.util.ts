import { createHmac, randomBytes } from 'crypto';

export function hashApiKey(rawKey: string, salt: string): string {
  return createHmac('sha256', salt).update(rawKey).digest('hex');
}

export function generateApiKey(): string {
  return 'akp_' + randomBytes(32).toString('hex');
}