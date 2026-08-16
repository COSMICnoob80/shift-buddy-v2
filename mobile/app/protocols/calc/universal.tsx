import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

function NumInput({
  label, value, onChange, unit,
}: {
  label: string; value: string; onChange: (v: string) => void; unit?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={s_field}>
      <Text style={[s_label, { color: colors.textSecondary }]}>
        {label}{unit ? ` (${unit})` : ''}
      </Text>
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
      {note ? <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>{note}</Text> : null}
    </View>
  );
}

function DrugRow({ name, dose }: { name: string; dose: string }) {
  const { colors } = useTheme();
  return (
    <View style={s_drugRow}>
      <Text style={[s_drugName, { color: colors.text }]}>{name}</Text>
      <Text style={{ fontSize: 14, color: colors.text, lineHeight: 20 }}>{dose}</Text>
    </View>
  );
}

function calcBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function calcBSA(weightKg: number, heightCm: number): number {
  return Math.sqrt((heightCm * weightKg) / 3600);
}

type DrugDose = { concentration: string; dose: string; route: string };

function calcDrugDoses(weightKg: number): Record<string, DrugDose> {
  const w = weightKg;
  return {
    Adrenaline: {
      concentration: '1 mg/mL (1:1000)',
      dose: `0.5 mg (${(0.5).toFixed(2)} mL) IM, or ${(0.01 * w).toFixed(2)} mg (${((0.01 * w)).toFixed(2)} mL) IV for anaphylaxis`,
      route: 'IM/IV',
    },
    Amiodarone: {
      concentration: '50 mg/mL',
      dose: `Loading: 5 mg/kg = ${(5 * w).toFixed(0)} mg (${((5 * w) / 50).toFixed(1)} mL) IV over 20-120 min. Max single dose 300 mg IV.`,
      route: 'IV',
    },
    Atropine: {
      concentration: '0.6 mg/mL',
      dose: `0.6 mg (1 mL) IV every 3-5 min, max total 3 mg. For bradycardia.`,
      route: 'IV',
    },
    Paracetamol: {
      concentration: '10 mg/mL (IV) / 120 mg/5 mL (oral)',
      dose: `15 mg/kg = ${(15 * w).toFixed(0)} mg (${((15 * w) / 10).toFixed(1)} mL IV, or ${((15 * w) / 24).toFixed(1)} mL oral). Max single: 1000 mg.`,
      route: 'IV/PO',
    },
  };
}

export default function UniversalDoseCalc() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const { colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const ageNum = parseFloat(age);
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);
  const valid =
    !isNaN(ageNum) && ageNum > 0 &&
    !isNaN(weightNum) && weightNum > 0 &&
    !isNaN(heightNum) && heightNum > 0;

  const bmi = valid ? calcBMI(weightNum, heightNum) : null;
  const bsa = valid ? calcBSA(weightNum, heightNum) : null;
  const drugs = valid ? calcDrugDoses(weightNum) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Universal Dose Calculator</Text>

      <NumInput label="Age" value={age} onChange={setAge} unit="years" />
      <NumInput label="Weight" value={weight} onChange={setWeight} unit="kg" />
      <NumInput label="Height" value={height} onChange={setHeight} unit="cm" />

      {bmi !== null && bsa !== null && (
        <>
          <ResultBox
            value={`BMI: ${bmi.toFixed(1)} kg/m²`}
            note={
              bmi < 18.5 ? 'Underweight'
              : bmi < 25 ? 'Normal range'
              : bmi < 30 ? 'Overweight'
              : 'Obese'
            }
          />
          <ResultBox value={`BSA: ${bsa.toFixed(2)} m²`} note="Mosteller formula" />

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Emergency Drug Doses</Text>
            {drugs && Object.entries(drugs).map(([name, info]) => (
              <View key={name} style={[styles.drugCard, { backgroundColor: colors.cardBackground }]}>
                <DrugRow name={name} dose={info.dose} />
                <Text style={{ fontSize: 12, color: colors.icon, marginTop: 6 }}>
                  {info.concentration} — Route: {info.route}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s_field: any = { marginBottom: 16 };
const s_label: any = { fontSize: 14, fontWeight: '600', marginBottom: 4 };
const s_input: any = { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18 };
const s_result: any = { marginTop: 16, borderRadius: 12, padding: 20, alignItems: 'center' };
const s_resultValue: any = { fontSize: 24, fontWeight: '700', marginBottom: 6 };
const s_drugRow: any = { marginBottom: 4 };
const s_drugName: any = { fontSize: 16, fontWeight: '700', marginBottom: 4 };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
    section: { marginTop: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    drugCard: {
      borderRadius: 10, padding: 14, marginBottom: 10,
      borderLeftWidth: 4, borderLeftColor: colors.primary,
    },
  });
}
