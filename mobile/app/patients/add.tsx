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
import { getDb } from '../../lib/db';
import { useTheme, Colors } from '../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;
type Acuity = 'critical' | 'urgent' | 'stable' | 'discharge_ready';

const ACUITY_OPTIONS: { value: Acuity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'stable', label: 'Stable' },
  { value: 'discharge_ready', label: 'Discharge Ready' },
];

const SEX_OPTIONS = ['Male', 'Female', 'Other'];

interface FormState {
  name: string;
  bedNumber: string;
  diagnosis: string;
  age: string;
  sex: string;
  acuity: Acuity;
  ward: string;
  medications: string;
}

const BLANK: FormState = {
  name: '', bedNumber: '', diagnosis: '', age: '', sex: 'Male',
  acuity: 'stable', ward: '', medications: '',
};

async function loadPatient(db: SQLiteDatabase, id: string): Promise<FormState | null> {
  const row = await db.getFirstAsync<{
    name: string; bed_number: string; diagnosis: string; age: number | null;
    sex: string | null; acuity: string; ward: string | null; current_medications: string | null;
  }>('SELECT * FROM patients WHERE id = ?', [id]);
  if (!row) return null;
  return {
    name: row.name, bedNumber: row.bed_number, diagnosis: row.diagnosis,
    age: row.age?.toString() ?? '', sex: row.sex ?? 'Male',
    acuity: (row.acuity as Acuity) ?? 'stable', ward: row.ward ?? '',
    medications: row.current_medications ?? '',
  };
}

export default function AddPatientScreen() {
  const { edit, id } = useLocalSearchParams<{ edit?: string; id?: string }>();
  const isEdit = edit === '1' && !!id;
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => { getDb().then(setDb); }, []);

  useEffect(() => {
    if (db && isEdit && id) {
      loadPatient(db, id).then((data) => {
        if (data) setForm(data);
      });
    }
  }, [db, isEdit, id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!db) return;
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    if (!form.bedNumber.trim()) { Alert.alert('Bed number required'); return; }
    if (!form.diagnosis.trim()) { Alert.alert('Diagnosis required'); return; }

    setSaving(true);
    const now = new Date().toISOString();

    try {
      if (isEdit && id) {
        await db.runAsync(
          `UPDATE patients SET name=?, bed_number=?, diagnosis=?, age=?, sex=?, acuity=?, ward=?, current_medications=?, updated_at=? WHERE id=?`,
          [form.name.trim(), form.bedNumber.trim(), form.diagnosis.trim(),
           form.age ? parseInt(form.age, 10) : null, form.sex, form.acuity,
           form.ward.trim() || null, form.medications.trim() || null, now, id],
        );
      } else {
        const newId = Crypto.randomUUID();
        await db.runAsync(
          `INSERT INTO patients (id,name,bed_number,diagnosis,age,sex,acuity,ward,current_medications,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'active',?,?)`,
          [newId, form.name.trim(), form.bedNumber.trim(), form.diagnosis.trim(),
           form.age ? parseInt(form.age, 10) : null, form.sex, form.acuity,
           form.ward.trim() || null, form.medications.trim() || null, now, now],
        );
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Field label="Name *" value={form.name} onChangeText={(v) => setField('name', v)} placeholder="Patient full name" colors={colors} />
        <Field label="Bed Number *" value={form.bedNumber} onChangeText={(v) => setField('bedNumber', v)} placeholder="e.g. 4B" colors={colors} />
        <Field label="Diagnosis *" value={form.diagnosis} onChangeText={(v) => setField('diagnosis', v)} placeholder="Primary diagnosis" colors={colors} />
        <Field label="Age" value={form.age} onChangeText={(v) => setField('age', v)} placeholder="Years" keyboardType="numeric" colors={colors} />
        <Field label="Ward" value={form.ward} onChangeText={(v) => setField('ward', v)} placeholder="e.g. General Medicine" colors={colors} />

        <Text style={[styles.label, { color: colors.textSecondary }]}>Sex</Text>
        <View style={styles.row}>
          {SEX_OPTIONS.map((s) => (
            <Pressable
              key={s}
              style={[styles.pill, { borderColor: colors.border }, form.sex === s && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
              onPress={() => setField('sex', s)}
            >
              <Text style={[styles.pillText, { color: colors.text }, form.sex === s && { color: colors.primary, fontWeight: '600' }]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Acuity</Text>
        <View style={styles.row}>
          {ACUITY_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={[styles.pill, { borderColor: colors.border }, form.acuity === o.value && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
              onPress={() => setField('acuity', o.value)}
            >
              <Text style={[styles.pillText, { color: colors.text }, form.acuity === o.value && { color: colors.primary, fontWeight: '600' }]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Medications</Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          value={form.medications}
          onChangeText={(v) => setField('medications', v)}
          placeholder="Current medications (free text)"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
        />

        <Pressable
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Update Patient' : 'Add Patient'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, colors }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric'; colors: ThemeColors;
}) {
  return (
    <>
      <Text style={[s_label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[s_input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType ?? 'default'}
      />
    </>
  );
}

const s_label: any = { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 4 };
const s_input: any = { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 4 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    multiline: { height: 90, textAlignVertical: 'top' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
    pillText: { fontSize: 13 },
    saveBtn: { marginTop: 28, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  });
}
