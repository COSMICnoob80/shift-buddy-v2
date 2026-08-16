import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';
import { isVitalCritical } from '../../../lib/is_critical';
import { uuid } from '../../../lib/uuid';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

interface VitalField {
  key: string;
  dbCol: string;
  label: string;
  unit: string;
  short: string;
  decimal?: boolean;
}

const VITAL_FIELDS: VitalField[] = [
  { key: 'hr', dbCol: 'heart_rate', label: 'Heart Rate', unit: 'bpm', short: 'HR' },
  { key: 'sbp', dbCol: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', short: 'SBP' },
  { key: 'dbp', dbCol: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', short: 'DBP' },
  { key: 'spo2', dbCol: 'spo2', label: 'SpO₂', unit: '%', short: 'SpO₂' },
  { key: 'temp', dbCol: 'temperature', label: 'Temperature', unit: '°C', short: 'Temp', decimal: true },
  { key: 'rr', dbCol: 'respiratory_rate', label: 'Respiratory Rate', unit: '/min', short: 'RR' },
  { key: 'gcs', dbCol: 'gcs', label: 'GCS', unit: '/15', short: 'GCS' },
];

const CRITICAL_PARAM: Record<string, string> = {
  heart_rate: 'heart_rate',
  systolic_bp: 'systolic_bp',
  diastolic_bp: 'diastolic_bp',
  spo2: 'spo2',
  temperature: 'temperature',
  respiratory_rate: 'respiratory_rate',
};

interface PrevVitals {
  [key: string]: number | null;
}

export default function VitalsKeypadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [prevVitals, setPrevVitals] = useState<PrevVitals>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recordedAt, setRecordedAt] = useState(new Date());
  const inputRefs = useRef<Record<string, TextInput | null>>({});
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(async (database) => {
      setDb(database);
      const prev = await database.getFirstAsync<Record<string, number | null>>(
        `SELECT heart_rate, systolic_bp, diastolic_bp, spo2, temperature,
                respiratory_rate, gcs
         FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1`,
        [id],
      );
      if (prev) setPrevVitals(prev as PrevVitals);
    });
  }, [id]);

  function setVal(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  const focusNext = useCallback((currentKey: string) => {
    const idx = VITAL_FIELDS.findIndex((f) => f.key === currentKey);
    if (idx < VITAL_FIELDS.length - 1) {
      const next = VITAL_FIELDS[idx + 1].key;
      setEditing(next);
      inputRefs.current[next]?.focus();
    }
  }, []);

  const handleKeypadPress = useCallback((key: string, digit: string) => {
    setValues((prev) => {
      const current = prev[key] ?? '';
      if (digit === '⌫') {
        return { ...prev, [key]: current.slice(0, -1) };
      }
      if (digit === '.' && current.includes('.')) return prev;
      if (current.length >= 6) return prev;
      return { ...prev, [key]: current + digit };
    });
  }, []);

  async function handleSave() {
    if (!db || !id) return;
    const hasAny = VITAL_FIELDS.some((f) => values[f.key]?.trim());
    if (!hasAny) { Alert.alert('Enter at least one vital sign'); return; }

    setSaving(true);
    const now = recordedAt.toISOString();
    const rowId = uuid();

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
          const alertId = uuid();
          const label = f.short;
          const message = `${level === 'critical' ? 'CRITICAL' : 'WARNING'}: ${label} = ${num} ${f.unit}`;
          await db.runAsync(
            `INSERT INTO alerts (id, patient_id, severity, parameter, value, unit, message, acknowledged, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [alertId, id, level, f.dbCol, num, f.unit, message, now],
          );
        }
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }

  const fmtTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function shiftMinutes(d: Date, mins: number) {
    const next = new Date(d);
    next.setMinutes(next.getMinutes() + mins);
    setRecordedAt(next);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.tsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable style={styles.tsBtn} onPress={() => shiftMinutes(recordedAt, -15)}>
          <Text style={[styles.tsBtnText, { color: colors.primary }]}>-15m</Text>
        </Pressable>
        <Text style={[styles.tsLabel, { color: colors.text }]}>
          {fmtTime(recordedAt)}
        </Text>
        <Pressable style={styles.tsBtn} onPress={() => shiftMinutes(recordedAt, 15)}>
          <Text style={[styles.tsBtnText, { color: colors.primary }]}>+15m</Text>
        </Pressable>
        <Pressable style={styles.tsBtn} onPress={() => setRecordedAt(new Date())}>
          <Text style={[styles.tsBtnText, { color: colors.icon }]}>Now</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {VITAL_FIELDS.map((f) => {
          const prev = prevVitals[f.dbCol];
          const editingThis = editing === f.key;
          return (
            <Pressable
              key={f.key}
              style={[
                styles.vitalCard,
                { backgroundColor: colors.cardBackground, borderColor: editingThis ? colors.primary : colors.border },
              ]}
              onPress={() => {
                setEditing(f.key);
                inputRefs.current[f.key]?.focus();
              }}
            >
              <Text style={[styles.vitalLabel, { color: colors.textSecondary }]}>{f.short}</Text>
              {prev != null && (
                <Text style={[styles.prevVal, { color: colors.textTertiary }]}>
                  prev: {f.decimal ? prev.toFixed(1) : prev}
                </Text>
              )}
              <TextInput
                ref={(el) => { inputRefs.current[f.key] = el; }}
                style={[
                  styles.valueInput,
                  { color: editingThis ? colors.primary : colors.text, borderColor: colors.border },
                ]}
                value={values[f.key] ?? ''}
                onChangeText={(v) => setVal(f.key, v)}
                keyboardType={f.decimal ? 'decimal-pad' : 'number-pad'}
                placeholder="—"
                placeholderTextColor={colors.textTertiary}
                onFocus={() => setEditing(f.key)}
                onBlur={() => setEditing(null)}
                onSubmitEditing={() => focusNext(f.key)}
                returnKeyType="next"
              />
              <Text style={[styles.vitalUnit, { color: colors.textTertiary }]}>{f.unit}</Text>
            </Pressable>
          );
        })}
      </View>

      {editing && (
        <View style={[styles.keypad, { backgroundColor: colors.secondary, borderTopColor: colors.border }]}>
          <View style={styles.keypadRow}>
            {['1', '2', '3', '⌫'].map((k) => (
              <Pressable
                key={k}
                style={[styles.keypadKey, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleKeypadPress(editing, k)}
              >
                <Text style={[styles.keypadKeyText, { color: k === '⌫' ? colors.danger : colors.text }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['4', '5', '6'].map((k) => (
              <Pressable
                key={k}
                style={[styles.keypadKey, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleKeypadPress(editing, k)}
              >
                <Text style={[styles.keypadKeyText, { color: colors.text }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['7', '8', '9'].map((k) => (
              <Pressable
                key={k}
                style={[styles.keypadKey, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleKeypadPress(editing, k)}
              >
                <Text style={[styles.keypadKeyText, { color: colors.text }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['.', '0', '00'].map((k) => (
              <Pressable
                key={k}
                style={[styles.keypadKey, { backgroundColor: colors.cardBackground }]}
                onPress={() => handleKeypadPress(editing, k)}
              >
                <Text style={[styles.keypadKeyText, { color: colors.text }]}>{k}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Vitals'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 12, paddingBottom: 40 },
    tsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12, gap: 4,
    },
    tsLabel: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
    tsBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    tsBtnText: { fontSize: 12, fontWeight: '600' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    vitalCard: {
      width: '31%', borderRadius: 10, borderWidth: 1.5,
      padding: 10, alignItems: 'center', minHeight: 90,
    },
    vitalLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    prevVal: { fontSize: 10, marginTop: 1 },
    valueInput: {
      fontSize: 20, fontWeight: '700', textAlign: 'center',
      marginTop: 4, paddingVertical: 2, minWidth: '100%',
    },
    vitalUnit: { fontSize: 10, marginTop: 1 },
    keypad: {
      borderRadius: 12, borderTopWidth: 1, padding: 8, marginBottom: 12,
    },
    keypadRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    keypadKey: {
      flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center', elevation: 1,
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
    },
    keypadKeyText: { fontSize: 20, fontWeight: '600' },
    saveBtn: { marginTop: 4, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  });
}
