import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { calcGFR, calcCorrectedCalcium, calcAnionGap } from '../../../lib/calculators';

type CalcType = 'gfr' | 'corrected-calcium' | 'anion-gap';

// ─── GFR Calculator ────────────────────────────────────────────────────────────

function GFRCalc() {
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');

  const ageNum = parseFloat(age);
  const crNum = parseFloat(creatinine);
  const valid = !isNaN(ageNum) && ageNum > 0 && !isNaN(crNum) && crNum > 0;
  const result = valid ? calcGFR(sex, ageNum, crNum) : null;

  function interpret(gfr: number): string {
    if (gfr >= 90) return 'G1 — Normal or high';
    if (gfr >= 60) return 'G2 — Mildly decreased';
    if (gfr >= 45) return 'G3a — Mildly to moderately decreased';
    if (gfr >= 30) return 'G3b — Moderately to severely decreased';
    if (gfr >= 15) return 'G4 — Severely decreased';
    return 'G5 — Kidney failure';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>eGFR (CKD-EPI 2021)</Text>
      <Text style={styles.label}>Sex</Text>
      <View style={styles.row}>
        {(['male', 'female'] as const).map((s) => (
          <Text
            key={s}
            style={[styles.toggle, sex === s && styles.toggleActive]}
            onPress={() => setSex(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Text>
        ))}
      </View>
      <NumInput label="Age (years)" value={age} onChange={setAge} />
      <NumInput label="Creatinine (mg/dL)" value={creatinine} onChange={setCreatinine} />
      {result !== null && (
        <ResultBox value={`${result.toFixed(1)} mL/min/1.73m²`} note={interpret(result)} />
      )}
    </ScrollView>
  );
}

// ─── Corrected Calcium ─────────────────────────────────────────────────────────

function CorrectedCalciumCalc() {
  const [calcium, setCalcium] = useState('');
  const [albumin, setAlbumin] = useState('');

  const caNum = parseFloat(calcium);
  const albNum = parseFloat(albumin);
  const valid = !isNaN(caNum) && !isNaN(albNum) && albNum >= 0;
  const result = valid ? calcCorrectedCalcium(caNum, albNum) : null;

  function interpret(ca: number): string {
    if (ca < 8.5) return 'Low — Hypocalcaemia';
    if (ca <= 10.5) return 'Normal';
    if (ca <= 12.0) return 'Mild hypercalcaemia';
    if (ca <= 14.0) return 'Moderate hypercalcaemia';
    return 'Severe hypercalcaemia — urgent review';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Corrected Calcium</Text>
      <NumInput label="Total Calcium (mg/dL)" value={calcium} onChange={setCalcium} />
      <NumInput label="Albumin (g/dL)" value={albumin} onChange={setAlbumin} />
      {result !== null && (
        <ResultBox value={`${result.toFixed(2)} mg/dL`} note={interpret(result)} />
      )}
    </ScrollView>
  );
}

// ─── Anion Gap ─────────────────────────────────────────────────────────────────

function AnionGapCalc() {
  const [na, setNa] = useState('');
  const [cl, setCl] = useState('');
  const [hco3, setHco3] = useState('');

  const naNum = parseFloat(na);
  const clNum = parseFloat(cl);
  const hco3Num = parseFloat(hco3);
  const valid = !isNaN(naNum) && !isNaN(clNum) && !isNaN(hco3Num);
  const result = valid ? calcAnionGap(naNum, clNum, hco3Num) : null;

  function interpret(ag: number): string {
    if (ag <= 12) return 'Normal (≤ 12 mEq/L)';
    if (ag <= 20) return 'Mildly elevated — consider MUDPILES';
    return 'High anion gap — MUDPILES differential';
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Anion Gap</Text>
      <NumInput label="Na⁺ (mEq/L)" value={na} onChange={setNa} />
      <NumInput label="Cl⁻ (mEq/L)" value={cl} onChange={setCl} />
      <NumInput label="HCO₃⁻ (mEq/L)" value={hco3} onChange={setHco3} />
      {result !== null && (
        <ResultBox value={`${result.toFixed(1)} mEq/L`} note={interpret(result)} />
      )}
    </ScrollView>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="0.0"
        placeholderTextColor="#aaa"
      />
    </View>
  );
}

function ResultBox({ value, note }: { value: string; note: string }) {
  return (
    <View style={styles.result}>
      <Text style={styles.resultValue}>{value}</Text>
      <Text style={styles.resultNote}>{note}</Text>
    </View>
  );
}

// ─── Router entry ──────────────────────────────────────────────────────────────

const SCREENS: Record<CalcType, React.FC> = {
  'gfr': GFRCalc,
  'corrected-calcium': CorrectedCalciumCalc,
  'anion-gap': AnionGapCalc,
};

export default function CalcScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const Screen = type ? SCREENS[type as CalcType] : null;

  if (!Screen) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Unknown calculator: {type}</Text>
      </View>
    );
  }

  return <Screen />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '700', color: '#11181C', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 4 },
  field: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    color: '#111',
  },
  row: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggle: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    color: '#555',
    fontSize: 15,
  },
  toggleActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
    color: '#fff',
  },
  result: {
    marginTop: 24,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  resultValue: { fontSize: 28, fontWeight: '700', color: '#0a7ea4', marginBottom: 6 },
  resultNote: { fontSize: 14, color: '#444', textAlign: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#888', fontSize: 16 },
});
