import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { isLabCritical } from '../../../lib/is_critical';
import { evaluateAki } from '../../../lib/protocols/aki_staging';
import { uuid } from '../../../lib/uuid';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

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
  { name: 'pH', unit: '', defaultUnit: '' },
  { name: 'HCO₃', unit: 'mmol/L', defaultUnit: 'mmol/L' },
];

interface PendingLab {
  name: string;
  value: string;
  unit: string;
}

export default function LabsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingLab[]>([]);
  const [recordedAt, setRecordedAt] = useState(new Date());
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => { getDb().then(setDb); }, []);

  const handleAdd = useCallback(() => {
    if (!selectedTest) return;
    const raw = value.trim();
    if (!raw) { Alert.alert('Enter a value'); return; }
    const num = parseFloat(raw);
    if (isNaN(num)) { Alert.alert('Invalid number'); return; }
    const opt = LAB_OPTIONS.find((o) => o.name === selectedTest);
    setPending((prev) => [...prev, { name: selectedTest, value: raw, unit: opt?.unit ?? '' }]);
    setValue('');
    setSelectedTest(null);
  }, [selectedTest, value]);

  async function handleSave() {
    if (!db || !id) return;
    if (pending.length === 0) { Alert.alert('Add at least one test result'); return; }

    setSaving(true);
    const now = recordedAt.toISOString();

    try {
      for (const p of pending) {
        const num = parseFloat(p.value);
        if (isNaN(num)) continue;
        const labId = uuid();
        const criticalResult = isLabCritical(p.name, num);

        await db.runAsync(
          'INSERT INTO lab_results (id, patient_id, test_name, value, unit, is_critical, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [labId, id, p.name, num, p.unit, criticalResult ? 1 : 0, now],
        );

        if (criticalResult) {
          const alertId = uuid();
          await db.runAsync(
            `INSERT INTO alerts (id, patient_id, severity, parameter, value, unit, message, acknowledged, created_at)
             VALUES (?, ?, 'critical', ?, ?, ?, ?, 0, ?)`,
            [alertId, id, p.name, num, p.unit, criticalResult.instruction, now],
          );
        }

        if (p.name === 'Creatinine') {
          const akiResult = evaluateAki(num, id, new Date(now), db);
          if (akiResult.alertGenerated && akiResult.severity !== 'insufficient_data') {
            const akiAlertId = uuid();
            const akiMsg = `AKI ${akiResult.severity.toUpperCase()}: ${akiResult.escalation ?? akiResult.recommendations[0]?.action ?? 'See protocol'}`;
            await db.runAsync(
              `INSERT INTO alerts (id, patient_id, severity, parameter, value, unit, message, acknowledged, created_at)
               VALUES (?, ?, 'critical', 'Creatinine', ?, 'mg/dL', ?, 0, ?)`,
              [akiAlertId, id, num, akiMsg, now],
            );
          }
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

  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.tsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable style={styles.tsBtn} onPress={() => shiftMinutes(recordedAt, -15)}>
          <Text style={[styles.tsBtnText, { color: colors.primary }]}>-15m</Text>
        </Pressable>
        <Text style={[styles.tsLabel, { color: colors.text }]}>{fmtTime(recordedAt)}</Text>
        <Pressable style={styles.tsBtn} onPress={() => shiftMinutes(recordedAt, 15)}>
          <Text style={[styles.tsBtnText, { color: colors.primary }]}>+15m</Text>
        </Pressable>
        <Pressable style={styles.tsBtn} onPress={() => setRecordedAt(new Date())}>
          <Text style={[styles.tsBtnText, { color: colors.icon }]}>Now</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select Test</Text>
      <View style={styles.grid}>
        {LAB_OPTIONS.map((o) => {
          const isQueued = pending.some((p) => p.name === o.name);
          return (
            <Pressable
              key={o.name}
              style={[
                styles.testPill,
                { borderColor: colors.border },
                selectedTest === o.name && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                isQueued && { borderColor: colors.success, backgroundColor: colors.successBg },
              ]}
              onPress={() => {
                setSelectedTest(o.name);
                setValue('');
              }}
            >
              <Text style={[
                styles.testPillText,
                { color: colors.textSecondary },
                selectedTest === o.name && { color: colors.primary, fontWeight: '700' },
                isQueued && { color: colors.success, fontWeight: '700' },
              ]}>
                {o.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedTest && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Value ({LAB_OPTIONS.find((o) => o.name === selectedTest)?.unit || 'units'})
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder={`Enter ${selectedTest}`}
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
            onPress={handleAdd}
          >
            <Text style={[styles.addBtnText, { color: colors.primary }]}>Add to list</Text>
          </Pressable>
        </>
      )}

      {pending.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            Pending ({pending.length})
          </Text>
          {pending.map((p, i) => (
            <View key={i} style={[styles.pendingRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Text style={[styles.pendingName, { color: colors.text }]}>{p.name}</Text>
              <Text style={[styles.pendingVal, { color: colors.text }]}>{p.value} {p.unit}</Text>
              <Pressable onPress={() => removePending(i)}>
                <Text style={[styles.removeBtn, { color: colors.danger }]}>✕</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving…' : `Save ${pending.length} result${pending.length > 1 ? 's' : ''}`}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    tsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 12, gap: 4,
    },
    tsLabel: { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
    tsBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    tsBtnText: { fontSize: 12, fontWeight: '600' },
    sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    testPill: {
      borderWidth: 1, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 6,
    },
    testPillText: { fontSize: 13 },
    input: {
      borderWidth: 1, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 12, fontSize: 22,
      textAlign: 'center',
    },
    addBtn: { marginTop: 8, borderRadius: 8, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
    addBtnText: { fontSize: 14, fontWeight: '600' },
    pendingRow: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 8, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6,
    },
    pendingName: { fontSize: 15, fontWeight: '600', flex: 1 },
    pendingVal: { fontSize: 15, fontWeight: '600', marginRight: 12 },
    removeBtn: { fontSize: 16, fontWeight: '700', paddingHorizontal: 6 },
    saveBtn: { marginTop: 20, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  });
}
