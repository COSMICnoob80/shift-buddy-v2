import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme, Colors } from '../../../theme/ThemeProvider';
import { calcGFR, calcCorrectedCalcium, calcAnionGap } from '../../../lib/calculators';

type ThemeColors = typeof Colors.light;
type CalcType = 'gfr' | 'corrected-calcium' | 'anion-gap';

function GFRCalc() {
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <Text style={[styles.title, { color: colors.text }]}>eGFR (CKD-EPI 2021)</Text>
      <Text style={[s_label, { color: colors.textSecondary }]}>Sex</Text>
      <View style={s_row}>
        {(['male', 'female'] as const).map((s) => (
          <Text
            key={s}
            style={[
              s_toggle,
              { borderColor: colors.border, color: colors.textSecondary },
              sex === s && { backgroundColor: colors.primary, borderColor: colors.primary, color: '#fff' },
            ]}
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

function CorrectedCalciumCalc() {
  const [calcium, setCalcium] = useState('');
  const [albumin, setAlbumin] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <Text style={[styles.title, { color: colors.text }]}>Corrected Calcium</Text>
      <NumInput label="Total Calcium (mg/dL)" value={calcium} onChange={setCalcium} />
      <NumInput label="Albumin (g/dL)" value={albumin} onChange={setAlbumin} />
      {result !== null && (
        <ResultBox value={`${result.toFixed(2)} mg/dL`} note={interpret(result)} />
      )}
    </ScrollView>
  );
}

function AnionGapCalc() {
  const [na, setNa] = useState('');
  const [cl, setCl] = useState('');
  const [hco3, setHco3] = useState('');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <Text style={[styles.title, { color: colors.text }]}>Anion Gap</Text>
      <NumInput label="Na⁺ (mEq/L)" value={na} onChange={setNa} />
      <NumInput label="Cl⁻ (mEq/L)" value={cl} onChange={setCl} />
      <NumInput label="HCO₃⁻ (mEq/L)" value={hco3} onChange={setHco3} />
      {result !== null && (
        <ResultBox value={`${result.toFixed(1)} mEq/L`} note={interpret(result)} />
      )}
    </ScrollView>
  );
}

function NumInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={s_field}>
      <Text style={[s_label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[s_input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="0.0"
        placeholderTextColor={colors.textTertiary}
      />
    </View>
  );
}

function ResultBox({ value, note }: { value: string; note: string }) {
  const { colors } = useTheme();
  return (
    <View style={[s_result, { backgroundColor: colors.primary + '12' }]}>
      <Text style={[s_resultValue, { color: colors.primary }]}>{value}</Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>{note}</Text>
    </View>
  );
}

const SCREENS: Record<CalcType, React.FC> = {
  'gfr': GFRCalc,
  'corrected-calcium': CorrectedCalciumCalc,
  'anion-gap': AnionGapCalc,
};

export default function CalcScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const Screen = type ? SCREENS[type as CalcType] : null;
  const { colors } = useTheme();

  if (!Screen) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Unknown calculator: {type}</Text>
      </View>
    );
  }

  return <Screen />;
}

const s_label: any = { fontSize: 14, fontWeight: '600', marginBottom: 4 };
const s_field: any = { marginBottom: 16 };
const s_input: any = { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18 };
const s_row: any = { flexDirection: 'row', gap: 8, marginBottom: 16 };
const s_toggle: any = { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1, fontSize: 15, overflow: 'hidden' };
const s_result: any = { marginTop: 24, borderRadius: 12, padding: 20, alignItems: 'center' };
const s_resultValue: any = { fontSize: 28, fontWeight: '700', marginBottom: 6 };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  });
}
