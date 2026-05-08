/**
 * T019 — Patient detail screen.
 * Sections: active alerts, latest vitals, latest labs, medications.
 * Action buttons: Add Vitals, Add Labs, Camera, Share.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';
import AlertBanner from '../../../components/AlertBanner';
import { generateSummary } from '../../../lib/summary';

interface Patient {
  id: string; name: string; bed_number: string; diagnosis: string;
  acuity: string; ward: string | null; current_medications: string | null;
  last_photo_path: string | null;
}

interface VitalsRow {
  heart_rate: number | null; systolic_bp: number | null; diastolic_bp: number | null;
  temperature: number | null; spo2: number | null; respiratory_rate: number | null;
  gcs: number | null; recorded_at: string;
}

interface LabRow { test_name: string; value: number; unit: string; recorded_at: string }

interface AlertRow {
  id: string; severity: string; parameter: string; value: number; unit: string | null;
  message: string; created_at: string;
}

async function loadDetail(db: SQLiteDatabase, id: string) {
  const patient = await db.getFirstAsync<Patient>('SELECT * FROM patients WHERE id = ?', [id]);
  const alerts = await db.getAllAsync<AlertRow>(
    'SELECT * FROM alerts WHERE patient_id = ? AND acknowledged = 0 ORDER BY created_at DESC',
    [id],
  );
  const vitals = await db.getFirstAsync<VitalsRow>(
    'SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1',
    [id],
  );
  const labMap = new Map<string, LabRow>();
  const allLabs = await db.getAllAsync<LabRow>(
    'SELECT test_name, value, unit, recorded_at FROM lab_results WHERE patient_id = ? ORDER BY recorded_at DESC',
    [id],
  );
  for (const lab of allLabs) {
    if (!labMap.has(lab.test_name)) labMap.set(lab.test_name, lab);
  }
  return { patient, alerts, vitals, labs: Array.from(labMap.values()) };
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof loadDetail>> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { getDb().then(setDb); }, []);

  const refresh = useCallback(async () => {
    if (!db || !id) return;
    setRefreshing(true);
    const data = await loadDetail(db, id);
    setDetail(data);
    setRefreshing(false);
  }, [db, id]);

  useEffect(() => { if (db) refresh(); }, [db, refresh]);

  async function handleShare() {
    if (!db || !id) return;
    const text = await generateSummary(id, db);
    const encoded = encodeURIComponent(text);
    const wa = `whatsapp://send?text=${encoded}`;
    const canOpen = await Linking.canOpenURL(wa);
    if (canOpen) {
      await Linking.openURL(wa);
    } else {
      await Linking.openURL(`https://wa.me/?text=${encoded}`);
    }
  }

  if (!detail || !detail.patient) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const { patient, alerts, vitals, labs } = detail;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.meta}>Bed {patient.bed_number}{patient.ward ? ` · ${patient.ward}` : ''}</Text>
        <Text style={styles.diagnosis}>{patient.diagnosis}</Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <ActionBtn label="+ Vitals" color="#0a7ea4" onPress={() => router.push({ pathname: '/patients/[id]/vitals', params: { id } })} />
        <ActionBtn label="+ Labs" color="#7c3aed" onPress={() => router.push({ pathname: '/patients/[id]/labs', params: { id } })} />
        <ActionBtn label="Camera" color="#065f46" onPress={() => router.push({ pathname: '/patients/[id]/camera', params: { id } })} />
        <ActionBtn label="Share" color="#92400e" onPress={handleShare} />
      </View>

      {/* Edit patient link */}
      <Pressable
        style={styles.editLink}
        onPress={() => router.push({ pathname: '/patients/add', params: { edit: '1', id } })}
      >
        <Text style={styles.editLinkText}>Edit patient record</Text>
      </Pressable>

      {/* Active alerts */}
      <Section title={`Active Alerts (${alerts.length})`}>
        {alerts.length === 0 ? (
          <Text style={styles.none}>No active alerts</Text>
        ) : (
          alerts.map((a) => <AlertBanner key={a.id} alert={a} />)
        )}
      </Section>

      {/* Latest vitals */}
      <Section title="Latest Vitals">
        {!vitals ? (
          <Text style={styles.none}>No vitals recorded</Text>
        ) : (
          <View style={styles.grid}>
            <VitalCell label="HR" value={vitals.heart_rate} unit="bpm" />
            <VitalCell label="SBP" value={vitals.systolic_bp} unit="mmHg" />
            <VitalCell label="DBP" value={vitals.diastolic_bp} unit="mmHg" />
            <VitalCell label="SpO₂" value={vitals.spo2} unit="%" />
            <VitalCell label="Temp" value={vitals.temperature} unit="°C" />
            <VitalCell label="RR" value={vitals.respiratory_rate} unit="/min" />
            <VitalCell label="GCS" value={vitals.gcs} unit="/15" />
          </View>
        )}
      </Section>

      {/* Latest labs */}
      <Section title="Latest Labs">
        {labs.length === 0 ? (
          <Text style={styles.none}>No labs recorded</Text>
        ) : (
          <View style={styles.labList}>
            {labs.map((l) => (
              <View key={l.test_name} style={styles.labRow}>
                <Text style={styles.labName}>{l.test_name}</Text>
                <Text style={styles.labValue}>{l.value} {l.unit}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* Medications */}
      <Section title="Medications">
        <Text style={styles.meds}>
          {patient.current_medications?.trim() || 'None recorded'}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ActionBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionBtn, { backgroundColor: color }, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Text style={styles.actionBtnText}>{label}</Text>
    </Pressable>
  );
}

function VitalCell({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <View style={styles.vitalCell}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={styles.vitalValue}>{value != null ? `${value}${unit}` : '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6b7280' },
  header: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12, elevation: 1 },
  patientName: { fontSize: 22, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  diagnosis: { fontSize: 15, color: '#374151', marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexGrow: 1 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  editLink: { alignSelf: 'flex-end', marginBottom: 12 },
  editLinkText: { color: '#0a7ea4', fontSize: 13 },
  section: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  none: { color: '#9ca3af', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalCell: { width: '30%', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 10, alignItems: 'center' },
  vitalLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  vitalValue: { fontSize: 15, color: '#111827', fontWeight: '700', marginTop: 2 },
  labList: { gap: 4 },
  labRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  labName: { fontSize: 14, color: '#374151', fontWeight: '500' },
  labValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  meds: { fontSize: 14, color: '#374151', lineHeight: 20 },
});
