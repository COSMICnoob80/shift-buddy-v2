/**
 * T018 — Labs entry screen.
 * On save: insert lab row → isLabCritical() → insert alert if critical.
 * For Creatinine: also runs evaluateAki() and appends AKI stage to alert if triggered.
 * AC: K+ 6.2 → critical alert + protocol link shown immediately.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';
import { isLabCritical } from '../../../lib/is_critical';
import { evaluateAki } from '../../../lib/protocols/aki_staging';

interface LabOption { name: string; unit: string; defaultUnit: string }

const LAB_OPTIONS: LabOption[] = [
  { name: 'K+', unit: 'mmol/L', defaultUnit: 'mmol/L' },
  { name: 'Na+', unit: 'mmol/L', defaultUnit: 'mmol/L' },
  { name: 'Creatinine', unit: 'mg/dL', defaultUnit: 'mg/dL' },
  { name: 'Hemoglobin', unit: 'g/dL', defaultUnit: 'g/dL' },
  { name: 'Platelets', unit: '×10⁹/L', defaultUnit: '×10⁹/L' },
  { name: 'INR', unit: '', defaultUnit: '' },
  { name: 'Blood Sugar', unit: 'mg/dL', defaultUnit: 'mg/dL' },
  { name: 'Lactate', unit: 'mmol/L', defaultUnit: 'mmol/L' },
  { name: 'Troponin', unit: 'ng/mL', defaultUnit: 'ng/mL' },
];

export default function LabsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [selectedTest, setSelectedTest] = useState(LAB_OPTIONS[0].name);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getDb().then(setDb); }, []);

  const currentOption = LAB_OPTIONS.find((o) => o.name === selectedTest) ?? LAB_OPTIONS[0];

  async function handleSave() {
    if (!db || !id) return;
    const raw = value.trim();
    if (!raw) { Alert.alert('Enter a value'); return; }
    const num = parseFloat(raw);
    if (isNaN(num)) { Alert.alert('Invalid number'); return; }

    setSaving(true);
    const now = new Date().toISOString();
    const labId = Crypto.randomUUID();
    const critical = isLabCritical(selectedTest, num);

    try {
      await db.runAsync(
        'INSERT INTO lab_results (id, patient_id, test_name, value, unit, is_critical, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [labId, id, selectedTest, num, currentOption.unit, critical ? 1 : 0, now],
      );

      if (critical) {
        const alertId = Crypto.randomUUID();
        const message = `🔴 CRITICAL: ${selectedTest} = ${num} ${currentOption.unit}`;
        await db.runAsync(
          `INSERT INTO alerts (id, patient_id, severity, parameter, value, unit, message, acknowledged, created_at)
           VALUES (?, ?, 'critical', ?, ?, ?, ?, 0, ?)`,
          [alertId, id, selectedTest, num, currentOption.unit, message, now],
        );
      }

      // AKI evaluation for Creatinine
      if (selectedTest === 'Creatinine') {
        const akiResult = evaluateAki(num, id, new Date(now), db);
        if (akiResult.alertGenerated && akiResult.severity !== 'insufficient_data') {
          const akiAlertId = Crypto.randomUUID();
          const akiMsg = `AKI ${akiResult.severity.toUpperCase()}: ${akiResult.escalation ?? akiResult.recommendations[0]?.action ?? 'See protocol'}`;
          await db.runAsync(
            `INSERT INTO alerts (id, patient_id, severity, parameter, value, unit, message, acknowledged, created_at)
             VALUES (?, ?, 'critical', 'Creatinine', ?, 'mg/dL', ?, 0, ?)`,
            [akiAlertId, id, num, akiMsg, now],
          );
        }
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Select Test</Text>
        <View style={styles.grid}>
          {LAB_OPTIONS.map((o) => (
            <Pressable
              key={o.name}
              style={[styles.testPill, selectedTest === o.name && styles.testPillActive]}
              onPress={() => {
                setSelectedTest(o.name);
                setValue('');
              }}
            >
              <Text style={[styles.testPillText, selectedTest === o.name && styles.testPillTextActive]}>
                {o.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Value ({currentOption.unit || 'units'})</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder={`Enter ${selectedTest} value`}
          placeholderTextColor="#9ca3af"
          autoFocus
        />

        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : `Save ${selectedTest}`}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  testPill: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  testPillActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  testPillText: { fontSize: 13, color: '#374151' },
  testPillTextActive: { color: '#7c3aed', fontWeight: '700' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 24,
    color: '#111827', backgroundColor: '#fafafa', textAlign: 'center',
  },
  saveBtn: { marginTop: 28, backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
