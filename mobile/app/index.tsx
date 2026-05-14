import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTheme, Colors } from '../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;
type Mode = 'loading' | 'setup_enter' | 'setup_confirm' | 'unlock';

const BG_LOCK_MS = 5 * 60 * 1000;

export default function PinScreen() {
  const [mode, setMode] = useState<Mode>('loading');
  const [digits, setDigits] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const bgTimestamp = useRef<number | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const set = await isPinSet(db as unknown as import('../lib/pin').PinDb);
      setMode(set ? 'unlock' : 'setup_enter');
    })();
  }, []);

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
        router.replace('/protocols');
        return;
      }

      const ok = await verifyPin(next, db as unknown as import('../lib/pin').PinDb);
      if (ok) {
        router.replace('/protocols');
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
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>Doctor On Duty</Text>
        <Text style={{ fontSize: 13, color: colors.icon, marginBottom: 24, textAlign: 'center', paddingHorizontal: 40 }}>
          Clinical Protocols & Patient Tracker 2021
        </Text>
      </View>
    );
  }

  const title =
    mode === 'setup_enter' ? 'Create PIN'
    : mode === 'setup_confirm' ? 'Confirm PIN'
    : 'Enter PIN';

  const subtitle =
    mode === 'setup_enter' ? 'Enter a 4-digit PIN to secure patient data.'
    : mode === 'setup_confirm' ? 'Re-enter your PIN to confirm.'
    : 'Enter your PIN to continue.';

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary }}>Doctor On Duty</Text>

      <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.icon }]}>{subtitle}</Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, { borderColor: colors.primary }, digits.length > i && { backgroundColor: colors.primary }]}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: colors.cardBackground },
              pressed && { backgroundColor: colors.border },
            ]}
            onPress={() => {
              if (key === '⌫') handleDelete();
              else if (key !== '') handleDigit(key);
            }}
            disabled={key === ''}
          >
            <Text style={[styles.keyText, { color: colors.text }]}>{key}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
    heading: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
    subtitle: { fontSize: 14, marginBottom: 32, textAlign: 'center', paddingHorizontal: 40 },
    dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, backgroundColor: 'transparent' },
    error: { color: colors.danger, marginBottom: 12, fontSize: 14 },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'space-between', gap: 12, marginTop: 12 },
    key: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
    keyText: { fontSize: 26, fontWeight: '600' },
  });
}
