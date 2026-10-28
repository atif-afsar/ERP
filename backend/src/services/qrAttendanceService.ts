import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Rotating QR attendance tokens (v2).
 *
 * Time is cut into windows of `rotationSeconds`. For each window the server
 * derives, from a per-session secret, both the QR payload and a 6-digit code
 * that students can type when their camera is unavailable. The secret never
 * leaves the server, so a photographed code is useless once its window passes.
 */
export const QR_PREFIX = 'ENX-QR2';
/** Windows accepted behind the current one, to absorb scan and network delay. */
const GRACE_WINDOWS = 1;

export function newSigningSecret(): string {
  return randomBytes(32).toString('hex');
}

export function windowAt(rotationSeconds: number, now = Date.now()): number {
  return Math.floor(now / (rotationSeconds * 1000));
}

function signature(secret: string, sessionId: string, window: number): string {
  return createHmac('sha256', Buffer.from(secret, 'hex')).update(`qr.${sessionId}.${window}`).digest('base64url').slice(0, 22);
}

function shortCode(secret: string, sessionId: string, window: number): string {
  const digest = createHmac('sha256', Buffer.from(secret, 'hex')).update(`code.${sessionId}.${window}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function currentToken(session: { id: string; signing_secret: string; rotation_seconds: number }, now = Date.now()) {
  const window = windowAt(session.rotation_seconds, now);
  const nextWindowAt = (window + 1) * session.rotation_seconds * 1000;
  return {
    payload: `${QR_PREFIX}.${session.id}.${window}.${signature(session.signing_secret, session.id, window)}`,
    code: shortCode(session.signing_secret, session.id, window),
    rotatesInMs: nextWindowAt - now,
    rotationSeconds: session.rotation_seconds,
  };
}

/** Splits a scanned payload. Returns null for anything that is not a v2 EzyAura QR. */
export function parsePayload(payload: string): { sessionId: string; window: number; signature: string } | null {
  const match = /^ENX-QR2\.([0-9a-f-]{36})\.(\d{1,12})\.([A-Za-z0-9_-]{22})$/.exec(payload.trim());
  if (!match) return null;
  return { sessionId: match[1], window: Number(match[2]), signature: match[3] };
}

function isFreshWindow(rotationSeconds: number, window: number, now: number): boolean {
  const current = windowAt(rotationSeconds, now);
  return window <= current && window >= current - GRACE_WINDOWS;
}

export function verifyPayload(session: { id: string; signing_secret: string; rotation_seconds: number }, parsed: { window: number; signature: string }, now = Date.now()) {
  if (!isFreshWindow(session.rotation_seconds, parsed.window, now)) return false;
  return safeEqual(signature(session.signing_secret, session.id, parsed.window), parsed.signature);
}

export function verifyCode(session: { id: string; signing_secret: string; rotation_seconds: number }, code: string, now = Date.now()) {
  const current = windowAt(session.rotation_seconds, now);
  for (let window = current; window >= current - GRACE_WINDOWS; window--) {
    if (safeEqual(shortCode(session.signing_secret, session.id, window), code)) return true;
  }
  return false;
}
