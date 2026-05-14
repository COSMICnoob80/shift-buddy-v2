import React, { useMemo, useState } from 'react';
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
import * as Crypto from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

interface ReviewRow {
  param: string;
  value: string;
  unit: string;
}

export default function ReviewScreen() {
  const { id, values } = useLocalSearchParams<{ id: string; values?: string }>();

  const parsed: ReviewRow[] = useMemo(() => {
    if (!values) return [];
    try {
      const raw = JSON.parse(values) as { param: string; value: number; unit: string }[];
      return raw.map((r) => ({ param: r.param, value: String(r.value), unit: r.unit }));
    } catch {
      return [];
    }
  }, [values]);

  const [rows, setRows] = useState<ReviewRow[]>(parsed);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  function update(index: number, field: keyof ReviewRow, val: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, { param: '', value: '', unit: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!id) return;
    const db = await getDb();
    const now = new Date().toISOString();

    for (const row of rows) {
      const numVal = parseFloat(row.value);
      if (!row.param.trim() || isNaN(numVal)) continue;
      await db.runAsync(
        `INSERT INTO lab_results (id, patient_id, test_name, value, unit, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [Crypto.randomUUID(), id, row.param.trim(), numVal, row.unit || '', now],
      );
    }

    Alert.alert('Saved', `${rows.length} value(s) saved to lab records.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Review Extracted Values</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Verify and edit values before saving to patient record.
      </Text>

      {rows.map((row, i) => (
        <View key={i} style={styles.rowContainer}>
          <TextInput
            style={[styles.input, styles.paramInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={row.param}
            onChangeText={(v) => update(i, 'param', v)}
            placeholder="Test"
            placeholderTextColor={colors.textTertiary}
          />
          <TextInput
            style={[styles.input, styles.valueInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={row.value}
            onChangeText={(v) => update(i, 'value', v)}
            placeholder="Value"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, styles.unitInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
            value={row.unit}
            onChangeText={(v) => update(i, 'unit', v)}
            placeholder="Unit"
            placeholderTextColor={colors.textTertiary}
          />
          <Pressable style={styles.removeBtn} onPress={() => removeRow(i)}>
            <Text style={styles.removeBtnText}>X</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={[styles.addBtn, { borderColor: colors.primary }]} onPress={addRow}>
        <Text style={[styles.addBtnText, { color: colors.primary }]}>+ Add Row</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
        onPress={handleSave}
      >
        <Text style={styles.saveBtnText}>Save to Lab Records</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    subtitle: { fontSize: 13, marginBottom: 20 },
    rowContainer: { flexDirection: 'row', gap: 6, marginBottom: 10, alignItems: 'center' },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
    paramInput: { flex: 2 },
    valueInput: { flex: 1.5 },
    unitInput: { flex: 1.5 },
    removeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
    },
    removeBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
    addBtn: { borderWidth: 1, borderRadius: 8, borderStyle: 'dashed', padding: 12, alignItems: 'center', marginBottom: 20 },
    addBtnText: { fontSize: 14, fontWeight: '600' },
    saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
