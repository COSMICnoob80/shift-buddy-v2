/**
 * T017 — Vitals entry screen.
 * On save: insert vitals row → isVitalCritical() per field → insert alert if triggered.
 * AC: HR 135 → critical alert row created immediately.
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { isVitalCritical } from '../../../lib/is_critical';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

interface VitalField {
  key: string;
  dbCol: string;
  label: string;
  unit: string;
  decimal?: boolean;
}

const VITAL_FIELDS: VitalField[] = [
  { key: 'hr', dbCol: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { key: 'sbp', dbCol: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg' },
  { key: 'dbp', dbCol: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg' },
  { key: 'spo2', dbCol: 'spo2', label: 'SpO₂', unit: '%' },
  { key: 'temp', dbCol: 'temperature', label: 'Temperature', unit: '°C', decimal: true },
  { key: 'rr', dbCol: 'respiratory_rate', label: 'Respiratory Rate', unit: '/min' },
  { key: 'gcs', dbCol: 'gcs', label: 'GCS', unit: '/15' },
];

const CRITICAL_PARAM: Record<string, string> = {
  heart_rate: 'heart_rate',
  systolic_bp: 'systolic_bp',
  diastolic_bp: 'diastolic_bp',
  spo2: 'spo2',
  temperature: 'temperature',
  respiratory_rate: 'respiratory_rate',
};

async function insertAlertForVital(
  db: SQLiteDatabase,
  patientId: string,
  dbCol: string,
  value: number,
  unit: string,
  severity: 'warning' | 'critical',
) {
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const label = dbCol.replace(/_/g, ' ');
  const message = `${severity === 'critical' ? '🔴 CRITICAL' : '🟡 WARNING'}: ${label} = ${value} ${unit}`;
  await db.runAsync(
    `INSERT INTO alerts (id, patient_id, severity, parameter, value, unit, message, acknowledged, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, patientId, severity, dbCol, value, unit, message, now],
  );
}

export default function VitalsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => { getDb().then(setDb); }, []);

  function setVal(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!db || !id) return;
    const hasAny = VITAL_FIELDS.some((f) => values[f.key]?.trim());
    if (!hasAny) { Alert.alert('Enter at least one vital sign'); return; }

    setSaving(true);
    const now = new Date().toISOString();
    const rowId = Crypto.randomUUID();

    try {
      const cols = ['id', 'patient_id', 'recorded_at'];
      const params: (string | number)[] = [rowId, id, now];

      for (const f of VITAL_FIELDS) {
        const raw = values[f.key]?.trim();
        if (raw) {
          cols.push(f.dbCol);
          params.push(f.decimal ? parseFloat(raw) : parseInt(raw, 10));
        }
      }

      const placeholders = cols.map(() => '?').join(', ');
      await db.runAsync(`INSERT INTO vitals (${cols.join(', ')}) VALUES (${placeholders})`, params);

      for (const f of VITAL_FIELDS) {
        const raw = values[f.key]?.trim();
        if (!raw) continue;
        const num = f.decimal ? parseFloat(raw) : parseInt(raw, 10);
        const paramName = CRITICAL_PARAM[f.dbCol];
        if (!paramName) continue;
        const level = isVitalCritical(paramName, num);
        if (level) {
          await insertAlertForVital(db, id, f.dbCol, num, f.unit, level);
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
        <Text style={styles.hint}>All fields optional. Enter what is available.</Text>
        {VITAL_FIELDS.map((f) => (
          <View key={f.key} style={styles.fieldRow}>
            <Text style={styles.label}>
              {f.label} <Text style={styles.unit}>({f.unit})</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={values[f.key] ?? ''}
              onChangeText={(v) => setVal(f.key, v)}
              keyboardType={f.decimal ? 'decimal-pad' : 'number-pad'}
              placeholder="—"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        ))}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }, saving && styles.disabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Vitals'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
    fieldRow: { marginBottom: 14 },
    label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
    unit: { fontWeight: '400', color: colors.textTertiary },
    input: {
      borderWidth: 1, borderColor: colors.border, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 18,
      color: colors.text, backgroundColor: colors.inputBackground,
    },
    saveBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  });
}
