/**
 * PIN lock screen — shown on every cold start and after 5-min background.
 * First launch: setup flow (enter + confirm). Subsequent: unlock flow.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getDb } from '../lib/db';
import { isPinSet, setupPin, verifyPin } from '../lib/pin';

type Mode = 'loading' | 'setup_enter' | 'setup_confirm' | 'unlock';

const BG_LOCK_MS = 5 * 60 * 1000;

export default function PinScreen() {
  const [mode, setMode] = useState<Mode>('loading');
  const [digits, setDigits] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const bgTimestamp = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const set = await isPinSet(db as unknown as import('../lib/pin').PinDb);
      setMode(set ? 'unlock' : 'setup_enter');
    })();
  }, []);

  // Re-lock after 5-min background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background') {
        bgTimestamp.current = Date.now();
      } else if (state === 'active' && bgTimestamp.current !== null) {
        if (Date.now() - bgTimestamp.current >= BG_LOCK_MS) {
          setDigits('');
          setError('');
          setMode('unlock');
        }
        bgTimestamp.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const handleDigit = useCallback(
    async (d: string) => {
      const next = digits + d;
      setDigits(next);
      setError('');

      if (next.length < 4) return;

      const db = await getDb();

      if (mode === 'setup_enter') {
        setFirstPin(next);
        setDigits('');
        setMode('setup_confirm');
        return;
      }

      if (mode === 'setup_confirm') {
        if (next !== firstPin) {
          setError('PINs do not match. Try again.');
          setDigits('');
          setFirstPin('');
          setMode('setup_enter');
          return;
        }
        await setupPin(next, db as unknown as import('../lib/pin').PinDb);
        router.replace('/patients');
        return;
      }

      // unlock
      const ok = await verifyPin(next, db as unknown as import('../lib/pin').PinDb);
      if (ok) {
        router.replace('/patients');
      } else {
        setError('Incorrect PIN.');
        setDigits('');
      }
    },
    [digits, mode, firstPin],
  );

  const handleDelete = useCallback(() => {
    setDigits((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  if (mode === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Shift Buddy</Text>
      </View>
    );
  }

  const title =
    mode === 'setup_enter'
      ? 'Create PIN'
      : mode === 'setup_confirm'
        ? 'Confirm PIN'
        : 'Enter PIN';

  const subtitle =
    mode === 'setup_enter'
      ? 'Enter a 4-digit PIN to secure patient data.'
      : mode === 'setup_confirm'
        ? 'Re-enter your PIN to confirm.'
        : 'Enter your PIN to continue.';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shift Buddy</Text>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, digits.length > i && styles.dotFilled]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => {
              if (key === '⌫') handleDelete();
              else if (key !== '') handleDigit(key);
            }}
            disabled={key === ''}
          >
            <Text style={styles.keyText}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#0a7ea4', marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#11181C', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#687076', marginBottom: 32, textAlign: 'center', paddingHorizontal: 40 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#0a7ea4', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#0a7ea4' },
  error: { color: '#dc2626', marginBottom: 12, fontSize: 14 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'space-between', gap: 12, marginTop: 12 },
  key: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  keyPressed: { backgroundColor: '#e5e7eb' },
  keyText: { fontSize: 26, fontWeight: '600', color: '#11181C' },
});
