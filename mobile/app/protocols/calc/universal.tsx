import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function NumInput({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {unit ? ` (${unit})` : ''}
      </Text>
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
      {note ? <Text style={styles.resultNote}>{note}</Text> : null}
    </View>
  );
}

function DrugRow({ name, dose }: { name: string; dose: string }) {
  return (
    <View style={styles.drugRow}>
      <Text style={styles.drugName}>{name}</Text>
      <Text style={styles.drugDose}>{dose}</Text>
    </View>
  );
}

function calcBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function calcBSA(weightKg: number, heightCm: number): number {
  // Mosteller formula: sqrt((height_cm * weight_kg) / 3600)
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
  };
}

export default function UniversalDoseCalc() {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const ageNum = parseFloat(age);
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height);
  const valid =
    !isNaN(ageNum) &&
    ageNum > 0 &&
    !isNaN(weightNum) &&
    weightNum > 0 &&
    !isNaN(heightNum) &&
    heightNum > 0;

  const bmi = valid ? calcBMI(weightNum, heightNum) : null;
  const bsa = valid ? calcBSA(weightNum, heightNum) : null;
  const drugs = valid ? calcDrugDoses(weightNum) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Universal Dose Calculator</Text>

      <NumInput label="Age" value={age} onChange={setAge} unit="years" />
      <NumInput label="Weight" value={weight} onChange={setWeight} unit="kg" />
      <NumInput label="Height" value={height} onChange={setHeight} unit="cm" />

      {bmi !== null && bsa !== null && (
        <>
          <ResultBox
            value={`BMI: ${bmi.toFixed(1)} kg/m²`}
            note={
              bmi < 18.5
                ? 'Underweight'
                : bmi < 25
                  ? 'Normal range'
                  : bmi < 30
                    ? 'Overweight'
                    : 'Obese'
            }
          />
          <ResultBox value={`BSA: ${bsa.toFixed(2)} m²`} note="Mosteller formula" />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Drug Doses</Text>
            {drugs &&
              Object.entries(drugs).map(([name, info]) => (
                <View key={name} style={styles.drugCard}>
                  <DrugRow name={name} dose={info.dose} />
                  <Text style={styles.drugMeta}>
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
  result: {
    marginTop: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  resultValue: { fontSize: 24, fontWeight: '700', color: '#0a7ea4', marginBottom: 6 },
  resultNote: { fontSize: 14, color: '#444', textAlign: 'center' },
  section: { marginTop: 28 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 12,
  },
  drugCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0a7ea4',
  },
  drugRow: { marginBottom: 4 },
  drugName: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 4 },
  drugDose: { fontSize: 14, color: '#374151', lineHeight: 20 },
  drugMeta: { fontSize: 12, color: '#687076', marginTop: 6 },
});
