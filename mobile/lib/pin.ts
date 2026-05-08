/**
 * PIN lock utilities — SHA-256 + per-device salt stored in SecureStore.
 * Hash stored in SQLite `settings` table, salt in SecureStore (hardware-backed on Android 31+).
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const SALT_KEY = 'shift_buddy_pin_salt';
const PIN_SETTING_KEY = 'pin_hash';

export interface PinDb {
  runAsync(sql: string, params?: unknown[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

async function _ensureSalt(): Promise<string> {
  const existing = await SecureStore.getItemAsync(SALT_KEY);
  if (existing) return existing;
  const bytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  await SecureStore.setItemAsync(SALT_KEY, salt);
  return salt;
}

async function _hash(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin + salt);
}

export async function isPinSet(db: PinDb): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [PIN_SETTING_KEY],
  );
  return row !== null;
}

export async function setupPin(pin: string, db: PinDb): Promise<void> {
  const salt = await _ensureSalt();
  const hash = await _hash(pin, salt);
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [PIN_SETTING_KEY, hash],
  );
}

export async function verifyPin(pin: string, db: PinDb): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(SALT_KEY);
  if (!salt) return false;
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [PIN_SETTING_KEY],
  );
  if (!row) return false;
  const hash = await _hash(pin, salt);
  return hash === row.value;
}
