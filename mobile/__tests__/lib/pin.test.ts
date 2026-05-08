import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { isPinSet, setupPin, verifyPin } from '../../lib/pin';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 1 },
  digestStringAsync: jest.fn((_algo: number, input: string) =>
    Promise.resolve(`hashed:${input}`),
  ),
  getRandomBytesAsync: jest.fn(() =>
    Promise.resolve(
      new Uint8Array([0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10]),
    ),
  ),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

describe('isPinSet', () => {
  it('returns true when pin_hash row exists', async () => {
    const db = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn().mockResolvedValue({ value: 'abc' }),
    };
    expect(await isPinSet(db)).toBe(true);
  });

  it('returns false when no pin_hash row', async () => {
    const db = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };
    expect(await isPinSet(db)).toBe(false);
  });
});

describe('setupPin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates salt in SecureStore if none exists', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn(),
    };

    await setupPin('1234', db);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'shift_buddy_pin_salt',
      expect.any(String),
    );
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['pin_hash', expect.any(String)],
    );
  });

  it('reuses existing salt from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('existing-salt');
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('hashed:1234existing-salt');

    const db = {
      runAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn(),
    };

    await setupPin('1234', db);

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(db.runAsync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['pin_hash', 'hashed:1234existing-salt'],
    );
  });
});

describe('verifyPin', () => {
  it('returns false if no salt in SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const db = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };

    expect(await verifyPin('1234', db)).toBe(false);
  });

  it('returns false if no pin_hash row in DB', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('salt');

    const db = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn().mockResolvedValue(null),
    };

    expect(await verifyPin('1234', db)).toBe(false);
  });

  it('returns true if hash matches', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('salt');
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('hashed:1234salt');

    const db = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn().mockResolvedValue({ value: 'hashed:1234salt' }),
    };

    expect(await verifyPin('1234', db)).toBe(true);
  });

  it('returns false if hash does not match', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('salt');
    (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('hashed:9999salt');

    const db = {
      runAsync: jest.fn(),
      getFirstAsync: jest.fn().mockResolvedValue({ value: 'hashed:1234salt' }),
    };

    expect(await verifyPin('9999', db)).toBe(false);
  });
});
