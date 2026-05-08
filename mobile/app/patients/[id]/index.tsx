/**
 * T019 — Patient detail screen.
 * Sections: active alerts, latest vitals, latest labs, medications.
 * Action buttons: Add Vitals, Add Labs, Camera, Share.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { evaluate as evaluateHyperkalemia } from '../../../lib/protocols/hyperkalemia';
import { evaluate as evaluateDka } from '../../../lib/protocols/dka';
import { evaluateAki } from '../../../lib/protocols/aki_staging';
import { ProtocolResult } from '../../../lib/protocols/types';

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

const PROTOCOL_SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  emergency: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: 'EMERGENCY' },
  emergency_ecg: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: 'EMERGENCY' },
  severe: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: 'SEVERE' },
  stage_3: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626', label: 'STAGE 3' },
  stage_2: { bg: '#fffbeb', border: '#d97706', text: '#d97706', label: 'STAGE 2' },
  moderate: { bg: '#fffbeb', border: '#d97706', text: '#d97706', label: 'MODERATE' },
  stage_1: { bg: '#fffbeb', border: '#d97706', text: '#d97706', label: 'STAGE 1' },
  mild: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a', label: 'MILD' },
  needs_abg: { bg: '#f0f9ff', border: '#0284c7', text: '#0284c7', label: 'NEEDS ABG' },
};

function getProtocolResult(
  alert: AlertRow,
  labs: LabRow[],
  patientId: string,
  db: SQLiteDatabase,
): ProtocolResult | null {
  switch (alert.parameter) {
    case 'K+': {
      const result = evaluateHyperkalemia(alert.value, false);
      return result.alertGenerated ? result : null;
    }
    case 'blood_sugar': {
      const phLab = labs.find(l => l.test_name.toLowerCase() === 'ph');
      const hco3Lab = labs.find(l => /^hco3$|bicarb/i.test(l.test_name));
      if (phLab != null && hco3Lab != null) {
        return evaluateDka(alert.value, phLab.value, hco3Lab.value, 'alert');
      }
      return {
        severity: 'needs_abg',
        recommendations: [{
          action: 'Check ABG (pH, HCO3) to classify DKA severity',
          priority: 1,
          rationale: `Blood sugar ${alert.value} mg/dL — ABG needed for DKA evaluation`,
          source: 'DKA Management Guidelines (ADA 2024 / WHO)',
        }],
        escalation: 'Blood sugar critically elevated — obtain ABG STAT',
        alertGenerated: true,
      };
    }
    case 'creatinine': {
      return evaluateAki(alert.value, patientId, new Date(alert.created_at), db);
    }
    default:
      return null;
  }
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

  const protocolResults = useMemo(() => {
    if (!db || !detail) return [];
    const { patient, alerts, labs } = detail;
    return alerts
      .map(alert => {
        const result = getProtocolResult(alert, labs, patient.id, db);
        return result && result.alertGenerated ? { alert, result } : null;
      })
      .filter((r): r is { alert: AlertRow; result: ProtocolResult } => r !== null);
  }, [detail, db]);

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

      {/* Recommended Actions — protocol-driven */}
      {protocolResults.length > 0 && (
        <Section title={`Recommended Actions (${protocolResults.length})`}>
          {protocolResults.map(({ alert, result }) => (
            <ProtocolActions key={alert.id} result={result} parameter={alert.parameter} value={alert.value} unit={alert.unit} />
          ))}
        </Section>
      )}

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

function ProtocolActions({ result, parameter, value, unit }: { result: ProtocolResult; parameter: string; value: number; unit: string | null }) {
  const colors = PROTOCOL_SEVERITY_STYLES[result.severity] ?? { bg: '#f9fafb', border: '#6b7280', text: '#374151', label: result.severity.toUpperCase() };

  return (
    <View style={[styles.protocolBlock, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <View style={styles.protocolHeader}>
        <View style={[styles.protocolBadge, { backgroundColor: colors.border }]}>
          <Text style={styles.protocolBadgeText}>{colors.label}</Text>
        </View>
        <Text style={styles.protocolParam}>
          {parameter} = {value}{unit ? ` ${unit}` : ''}
        </Text>
      </View>

      {result.recommendations.map((rec) => (
        <View key={rec.priority} style={styles.recRow}>
          <View style={[styles.recNumber, { backgroundColor: colors.border }]}>
            <Text style={styles.recNumberText}>{rec.priority}</Text>
          </View>
          <View style={styles.recContent}>
            <Text style={styles.recAction}>{rec.action}</Text>
            <Text style={styles.recRationale}>{rec.rationale}</Text>
          </View>
        </View>
      ))}

      {result.escalation && (
        <View style={styles.escalationBanner}>
          <Text style={styles.escalationText}>🚨 {result.escalation}</Text>
        </View>
      )}
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
  protocolBlock: { borderRadius: 8, borderLeftWidth: 4, padding: 12, marginBottom: 8 },
  protocolHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  protocolBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  protocolBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  protocolParam: { fontSize: 14, fontWeight: '700', color: '#111827' },
  recRow: { flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'flex-start' },
  recNumber: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  recNumberText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  recContent: { flex: 1 },
  recAction: { fontSize: 13, fontWeight: '600', color: '#111827', lineHeight: 18 },
  recRationale: { fontSize: 11, color: '#6b7280', lineHeight: 15, marginTop: 1 },
  escalationBanner: { backgroundColor: '#fef2f2', borderRadius: 6, padding: 10, marginTop: 6, borderWidth: 1, borderColor: '#fecaca' },
  escalationText: { fontSize: 13, color: '#dc2626', fontWeight: '600', lineHeight: 18 },
});
