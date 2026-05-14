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
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb, dischargeWithNotes } from '../../lib/db';
import { useTheme, Colors } from '../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

export default function DischargeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [treatment, setTreatment] = useState('');
  const [followup, setFollowup] = useState('');
  const [saving, setSaving] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(async (database) => {
      setDb(database);
      if (id) {
        const row = await database.getFirstAsync<{ name: string }>(
          'SELECT name FROM patients WHERE id = ?', [id],
        );
        if (row) setPatientName(row.name);
      }
    });
  }, [id]);

  async function handleDischarge() {
    if (!db || !id) return;
    setSaving(true);
    try {
      await dischargeWithNotes(id, notes.trim(), treatment.trim(), followup.trim());
      Alert.alert('Patient Discharged', `${patientName} has been discharged.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', String(err));
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
        <Text style={[styles.title, { color: colors.text }]}>
          Discharge {patientName || 'Patient'}
        </Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Discharge Notes / Summary
        </Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Summary of hospital stay, key findings, procedures…"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={5}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Treatment / Medications on Discharge
        </Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          value={treatment}
          onChangeText={setTreatment}
          placeholder="Drug name, dose, duration (e.g., Amoxicillin 500mg TDS x 7 days)"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Follow-up Instructions
        </Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
          value={followup}
          onChangeText={setFollowup}
          placeholder="Follow-up clinic, review date, warning signs, when to return…"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
        />

        <View style={styles.btnRow}>
          <Pressable
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.dischargeBtn,
              { backgroundColor: colors.danger },
              pressed && { opacity: 0.8 },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleDischarge}
            disabled={saving}
          >
            <Text style={styles.dischargeBtnText}>
              {saving ? 'Discharging…' : 'Discharge Patient'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 4 },
    input: {
      borderWidth: 1, borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
    },
    multiline: { height: 100, textAlignVertical: 'top' },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
    cancelBtn: {
      flex: 1, borderWidth: 1, borderRadius: 10,
      paddingVertical: 14, alignItems: 'center',
    },
    cancelBtnText: { fontSize: 16, fontWeight: '600' },
    dischargeBtn: {
      flex: 2, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    },
    dischargeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
