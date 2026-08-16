import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { deletePatient } from '../lib/db';
import { useTheme, Colors } from '../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

export type Acuity = 'critical' | 'urgent' | 'stable' | 'discharge_ready';

export interface PatientCardProps {
  id: string;
  name: string;
  bedNumber: string;
  diagnosis: string;
  acuity: Acuity;
  alertCount: number;
  onPress: () => void;
  onLongPress: (id: string) => void;
}

const ACUITY_COLOR_KEYS: Record<Acuity, string> = {
  critical: 'danger',
  urgent: 'icon',
  stable: 'primary',
  discharge_ready: 'tint',
};

const ACUITY_LABEL: Record<Acuity, string> = {
  critical: 'CRITICAL',
  urgent: 'URGENT',
  stable: 'STABLE',
  discharge_ready: 'DISCHARGE READY',
};

export default function PatientCard({
  id, name, bedNumber, diagnosis, acuity, alertCount, onPress, onLongPress,
}: PatientCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const acuityColorKey = ACUITY_COLOR_KEYS[acuity] as keyof typeof colors;
  const color = colors[acuityColorKey] || colors.icon;
  const label = ACUITY_LABEL[acuity] ?? acuity.toUpperCase();

  const handleLongPress = () => {
    Alert.alert(
      'Patient Actions',
      `Choose action for ${name} (Bed ${bedNumber})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Patient',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Patient',
              `Permanently delete ${name} and ALL their data (vitals, labs, alerts)? This cannot be undone.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    await deletePatient(id);
                    onLongPress(id);
                  },
                },
              ],
            );
          },
        },
        {
          text: 'Quick Discharge',
          onPress: () => onLongPress(id),
        },
        {
          text: 'Discharge with Notes',
          onPress: () =>
            router.push(`/patients/discharge?id=${id}` as any),
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { borderLeftColor: color, backgroundColor: colors.cardBackground }, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={handleLongPress}
    >
      <View style={styles.row}>
        <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
        {alertCount > 0 && (
          <View style={[styles.alertBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.alertBadgeText}>{alertCount}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.bed, { color: colors.icon }]}>Bed {bedNumber}</Text>
      <Text style={[styles.diagnosis, { color: colors.text }]}>{diagnosis}</Text>
      <View style={[styles.acuityPill, { backgroundColor: color + '20' }]}>
        <Text style={[styles.acuityText, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { borderRadius: 10, padding: 14, marginHorizontal: 16, marginBottom: 8, borderLeftWidth: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    pressed: { opacity: 0.7 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 16, fontWeight: '700' },
    alertBadge: { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    alertBadgeText: { color: colors.background, fontSize: 11, fontWeight: '700' },
    bed: { fontSize: 12, marginBottom: 2 },
    diagnosis: { fontSize: 14, marginBottom: 6 },
    acuityPill: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    acuityText: { fontSize: 11, fontWeight: '700' },
  });
}
