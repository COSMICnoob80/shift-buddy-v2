/**
 * T015 — Add/edit patient form.
 * Edit mode: pass ?edit=1&id=<patientId> params.
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
import { getDb } from '../../lib/db';

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
  name: '',
  bedNumber: '',
  diagnosis: '',
  age: '',
  sex: 'Male',
  acuity: 'stable',
  ward: '',
  medications: '',
};

async function loadPatient(db: SQLiteDatabase, id: string): Promise<FormState | null> {
  const row = await db.getFirstAsync<{
    name: string; bed_number: string; diagnosis: string; age: number | null;
    sex: string | null; acuity: string; ward: string | null; current_medications: string | null;
  }>('SELECT * FROM patients WHERE id = ?', [id]);
  if (!row) return null;
  return {
    name: row.name,
    bedNumber: row.bed_number,
    diagnosis: row.diagnosis,
    age: row.age?.toString() ?? '',
    sex: row.sex ?? 'Male',
    acuity: (row.acuity as Acuity) ?? 'stable',
    ward: row.ward ?? '',
    medications: row.current_medications ?? '',
  };
}

export default function AddPatientScreen() {
  const { edit, id } = useLocalSearchParams<{ edit?: string; id?: string }>();
  const isEdit = edit === '1' && !!id;

  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDb().then(setDb);
  }, []);

  useEffect(() => {
    if (db && isEdit && id) {
      loadPatient(db, id).then((data) => {
        if (data) setForm(data);
      });
    }
  }, [db, isEdit, id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
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
          `INSERT INTO patients (id,name,bed_number,diagnosis,age,sex,acuity,ward,current_medications,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'admitted',?,?)`,
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Field label="Name *" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Patient full name" />
        <Field label="Bed Number *" value={form.bedNumber} onChangeText={(v) => set('bedNumber', v)} placeholder="e.g. 4B" />
        <Field label="Diagnosis *" value={form.diagnosis} onChangeText={(v) => set('diagnosis', v)} placeholder="Primary diagnosis" />
        <Field label="Age" value={form.age} onChangeText={(v) => set('age', v)} placeholder="Years" keyboardType="numeric" />
        <Field label="Ward" value={form.ward} onChangeText={(v) => set('ward', v)} placeholder="e.g. General Medicine" />

        <Text style={styles.label}>Sex</Text>
        <View style={styles.row}>
          {SEX_OPTIONS.map((s) => (
            <Pressable
              key={s}
              style={[styles.pill, form.sex === s && styles.pillActive]}
              onPress={() => set('sex', s)}
            >
              <Text style={[styles.pillText, form.sex === s && styles.pillTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Acuity</Text>
        <View style={styles.row}>
          {ACUITY_OPTIONS.map((o) => (
            <Pressable
              key={o.value}
              style={[styles.pill, form.acuity === o.value && styles.pillActive]}
              onPress={() => set('acuity', o.value)}
            >
              <Text style={[styles.pillText, form.acuity === o.value && styles.pillTextActive]}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Medications</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={form.medications}
          onChangeText={(v) => set('medications', v)}
          placeholder="Current medications (free text)"
          multiline
          numberOfLines={4}
          placeholderTextColor="#9ca3af"
        />

        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Update Patient' : 'Add Patient'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric'; multiline?: boolean;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        placeholderTextColor="#9ca3af"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#fafafa',
  },
  multiline: { height: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  pillActive: { borderColor: '#0a7ea4', backgroundColor: '#e0f2fe' },
  pillText: { fontSize: 13, color: '#374151' },
  pillTextActive: { color: '#0a7ea4', fontWeight: '600' },
  saveBtn: { marginTop: 28, backgroundColor: '#0a7ea4', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
