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
import { evaluate as evaluateHypoglycemia } from '../../../lib/protocols/hypoglycemia';
import { evaluate as evaluateAcs } from '../../../lib/protocols/acs';
import { evaluate as evaluateAnaphylaxis } from '../../../lib/protocols/anaphylaxis';
import { evaluate as evaluateRespiratory } from '../../../lib/protocols/respiratory';
import { ProtocolResult } from '../../../lib/protocols/types';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

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

function getProtocolResult(
  alert: AlertRow,
  labs: LabRow[],
  vitals: VitalsRow | null,
  patientId: string,
  database: SQLiteDatabase,
): ProtocolResult | null {
  switch (alert.parameter) {
    case 'K+': {
      const result = evaluateHyperkalemia(alert.value, false);
      return result.alertGenerated ? result : null;
    }
    case 'blood_sugar': {
      if (alert.value > 250) {
        const ph = labs.find(l => l.test_name === 'ph' || l.test_name === 'pH')?.value ?? null;
        const hco3 = labs.find(l => l.test_name === 'hco3' || l.test_name === 'bicarbonate')?.value ?? null;
        if (ph === null && hco3 === null) return null;
        const mentalStatus = (vitals?.gcs != null && vitals.gcs < 9) ? 'obtunded' : 'alert';
        const result = evaluateDka(alert.value, ph ?? 7.4, hco3 ?? 20, mentalStatus);
        return result.alertGenerated ? result : null;
      }
      if (alert.value < 70) {
        const conscious = vitals?.gcs == null || vitals.gcs >= 12;
        const result = evaluateHypoglycemia(alert.value, conscious);
        return result.alertGenerated ? result : null;
      }
      return null;
    }
    case 'creatinine': {
      const recordedAt = new Date(alert.created_at);
      const result = evaluateAki(alert.value, patientId, recordedAt, database);
      return result.alertGenerated ? result : null;
    }
    case 'heart_rate': {
      const ecg: 'normal' | 'stemi' | 'nstemi' | 'unknown' = 'unknown';
      const troponinRaised = labs.some(l => (l.test_name === 'troponin' || l.test_name === 'hs-cTn') && l.value > 0.04);
      const chestPainOngoing = false;
      const result = evaluateAcs(ecg, troponinRaised, chestPainOngoing, 0);
      return result.alertGenerated ? result : null;
    }
    case 'systolic_bp': {
      if (alert.value < 90) {
        const result = evaluateAnaphylaxis('patent', true, true, 70);
        return result.alertGenerated ? result : null;
      }
      return null;
    }
    case 'spo2': {
      const rr = vitals?.respiratory_rate ?? 20;
      const result = evaluateRespiratory(alert.value, rr, 'clear', false, false);
      return result.alertGenerated ? result : null;
    }
    case 'respiratory_rate': {
      const spo2 = vitals?.spo2 ?? 98;
      const result = evaluateRespiratory(spo2, alert.value, 'clear', false, false);
      return result.alertGenerated ? result : null;
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
  const { colors } = useTheme();

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
    const { alerts, labs, vitals } = detail;
    return alerts
      .map(alert => {
        const result = getProtocolResult(alert, labs, vitals, detail.patient!.id, db);
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

  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!detail || !detail.patient) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Loading…</Text>
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
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.patientName, { color: colors.text }]}>{patient.name}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Bed {patient.bed_number}{patient.ward ? ` · ${patient.ward}` : ''}</Text>
        <Text style={[styles.diagnosis, { color: colors.text }]}>{patient.diagnosis}</Text>
      </View>

      <View style={styles.actions}>
        <ActionBtn label="+ Vitals" color={colors.primary} onPress={() => router.push({ pathname: '/patients/[id]/vitals', params: { id } })} />
        <ActionBtn label="+ Labs" color="#7c3aed" onPress={() => router.push({ pathname: '/patients/[id]/labs', params: { id } })} />
        <ActionBtn label="Camera" color="#065f46" onPress={() => router.push({ pathname: '/patients/[id]/camera', params: { id } })} />
        <ActionBtn label="Share" color="#92400e" onPress={handleShare} />
      </View>

      <Pressable
        style={{ alignSelf: 'flex-end', marginBottom: 12 }}
        onPress={() => router.push({ pathname: '/patients/add', params: { edit: '1', id } })}
      >
        <Text style={{ color: colors.primary, fontSize: 13 }}>Edit patient record</Text>
      </Pressable>

      <Section title={`Active Alerts (${alerts.length})`} colors={colors}>
        {alerts.length === 0 ? (
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No active alerts</Text>
        ) : (
          alerts.map((a) => <AlertBanner key={a.id} alert={a} />)
        )}
      </Section>

      {protocolResults.length > 0 && (
        <Section title={`Recommended Actions (${protocolResults.length})`} colors={colors}>
          {protocolResults.map(({ alert, result }) => (
            <ProtocolActions key={alert.id} result={result} parameter={alert.parameter} value={alert.value} unit={alert.unit} colors={colors} />
          ))}
        </Section>
      )}

      <Section title="Latest Vitals" colors={colors}>
        {!vitals ? (
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No vitals recorded</Text>
        ) : (
          <View style={styles.grid}>
            <VitalCell label="HR" value={vitals.heart_rate} unit="bpm" colors={colors} />
            <VitalCell label="SBP" value={vitals.systolic_bp} unit="mmHg" colors={colors} />
            <VitalCell label="DBP" value={vitals.diastolic_bp} unit="mmHg" colors={colors} />
            <VitalCell label="SpO₂" value={vitals.spo2} unit="%" colors={colors} />
            <VitalCell label="Temp" value={vitals.temperature} unit="°C" colors={colors} />
            <VitalCell label="RR" value={vitals.respiratory_rate} unit="/min" colors={colors} />
            <VitalCell label="GCS" value={vitals.gcs} unit="/15" colors={colors} />
          </View>
        )}
      </Section>

      <Section title="Latest Labs" colors={colors}>
        {labs.length === 0 ? (
          <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No labs recorded</Text>
        ) : (
          <View style={{ gap: 4 }}>
            {labs.map((l) => (
              <View key={l.test_name} style={[styles.labRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.labName, { color: colors.text }]}>{l.test_name}</Text>
                <Text style={[styles.labValue, { color: colors.text }]}>{l.value} {l.unit}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section title="Medications" colors={colors}>
        <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>
          {patient.current_medications?.trim() || 'None recorded'}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: ThemeColors }) {
  return (
    <View style={[s_section, { backgroundColor: colors.surface }]}>
      <Text style={[s_sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function ActionBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [s_actionBtn, { backgroundColor: color }, pressed && { opacity: 0.8 }]}
      onPress={onPress}
    >
      <Text style={s_actionBtnText}>{label}</Text>
    </Pressable>
  );
}

function VitalCell({ label, value, unit, colors }: { label: string; value: number | null; unit: string; colors: ThemeColors }) {
  return (
    <View style={[s_vitalCell, { backgroundColor: colors.cardBackground }]}>
      <Text style={s_vitalLabel}>{label}</Text>
      <Text style={[s_vitalValue, { color: colors.text }]}>{value != null ? `${value}${unit}` : '—'}</Text>
    </View>
  );
}

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  emergency: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
  emergency_ecg: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
  severe: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
  stage_3: { bg: '#fef2f2', border: '#dc2626', text: '#dc2626' },
  stage_2: { bg: '#fffbeb', border: '#d97706', text: '#d97706' },
  moderate: { bg: '#fffbeb', border: '#d97706', text: '#d97706' },
  stage_1: { bg: '#fffbeb', border: '#d97706', text: '#d97706' },
  mild: { bg: '#f0fdf4', border: '#16a34a', text: '#16a34a' },
  needs_abg: { bg: '#f0f9ff', border: '#0284c7', text: '#0284c7' },
};

function ProtocolActions({ result, parameter, value, unit, colors }: { result: ProtocolResult; parameter: string; value: number; unit: string | null; colors: ThemeColors }) {
  const sevColors = SEVERITY_COLORS[result.severity] ?? { bg: colors.cardBackground, border: colors.icon, text: colors.textSecondary };
  const paramLabel = parameter === 'K+' ? 'HYPERKALEMIA' : parameter === 'blood_sugar' ? 'DKA' : parameter === 'creatinine' ? 'AKI' : parameter.toUpperCase();
  const source = result.recommendations[0]?.source ?? 'Doctor On Duty 2021';

  return (
    <View style={[s_protocolBlock, { backgroundColor: sevColors.bg, borderLeftColor: sevColors.border }]}>
      <View style={s_protocolHeader}>
        <Text style={[s_protocolTitle, { color: sevColors.text }]}>
          {paramLabel} — {result.severity.toUpperCase()} ({parameter} = {value}{unit ? ` ${unit}` : ''})
        </Text>
      </View>

      <Text style={[s_sectionHeading, { color: colors.textSecondary }]}>IMMEDIATE:</Text>
      {result.recommendations.map((rec) => (
        <View key={rec.priority} style={s_recRow}>
          <Text style={[s_bullet, { color: colors.text }]}>• </Text>
          <Text style={[s_recAction, { color: colors.text }]}>{rec.action}</Text>
        </View>
      ))}

      {result.escalation && (
        <>
          <Text style={[s_sectionHeading, { color: colors.textSecondary, marginTop: 8 }]}>ESCALATE:</Text>
          <View style={{ backgroundColor: '#fef2f2', borderRadius: 6, padding: 10, borderWidth: 1, borderColor: '#fecaca' }}>
            <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600', lineHeight: 18 }}>{result.escalation}</Text>
          </View>
        </>
      )}

      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8, fontStyle: 'italic' }}>Source: {source}</Text>
    </View>
  );
}

const s_section: any = {
  borderRadius: 10, padding: 14, marginBottom: 12, elevation: 1,
  shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
};
const s_sectionTitle: any = { fontSize: 14, fontWeight: '700', marginBottom: 10 };
const s_actionBtn: any = { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexGrow: 1 };
const s_actionBtnText: any = { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' };
const s_vitalCell: any = { width: '30%', borderRadius: 8, padding: 10, alignItems: 'center' };
const s_vitalLabel: any = { fontSize: 11, color: '#6b7280', fontWeight: '600' };
const s_vitalValue: any = { fontSize: 15, fontWeight: '700', marginTop: 2 };
const s_protocolBlock: any = { borderRadius: 8, borderLeftWidth: 4, padding: 12, marginBottom: 8 };
const s_protocolHeader: any = { marginBottom: 8 };
const s_protocolTitle: any = { fontSize: 15, fontWeight: '800', lineHeight: 20 };
const s_sectionHeading: any = { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 6 };
const s_recRow: any = { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 };
const s_bullet: any = { fontSize: 13, lineHeight: 20 };
const s_recAction: any = { fontSize: 13, lineHeight: 20, flex: 1 };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { borderRadius: 10, padding: 16, marginBottom: 12, elevation: 1,
      shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
    patientName: { fontSize: 22, fontWeight: '800', color: colors.text },
    meta: { fontSize: 13, marginTop: 2 },
    diagnosis: { fontSize: 15, marginTop: 4 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    labRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1 },
    labName: { fontSize: 14, fontWeight: '500' },
    labValue: { fontSize: 14, fontWeight: '600' },
  });
}
