import { randomInt } from 'node:crypto';

export const LINK_CODE_TTL_HOURS = 24;

export function generateLinkCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function linkCodeExpiresAt(): string {
  return new Date(Date.now() + LINK_CODE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}
