import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type Acuity = 'critical' | 'urgent' | 'stable' | 'discharge_ready';

export interface PatientCardProps {
  id: string;
  name: string;
  bedNumber: string;
  diagnosis: string;
  acuity: Acuity;
  alertCount: number;
  onPress: () => void;
}

const ACUITY_COLOR: Record<Acuity, string> = {
  critical: '#dc2626',
  urgent: '#d97706',
  stable: '#16a34a',
  discharge_ready: '#2563eb',
};

const ACUITY_LABEL: Record<Acuity, string> = {
  critical: 'CRITICAL',
  urgent: 'URGENT',
  stable: 'STABLE',
  discharge_ready: 'DISCHARGE READY',
};

export default function PatientCard({
  name,
  bedNumber,
  diagnosis,
  acuity,
  alertCount,
  onPress,
}: PatientCardProps) {
  const color = ACUITY_COLOR[acuity] ?? '#687076';
  const label = ACUITY_LABEL[acuity] ?? acuity.toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { borderLeftColor: color }, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <Text style={styles.name}>{name}</Text>
        {alertCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{alertCount}</Text>
          </View>
        )}
      </View>
      <Text style={styles.bed}>Bed {bedNumber}</Text>
      <Text style={styles.diagnosis} numberOfLines={1}>
        {diagnosis}
      </Text>
      <View style={[styles.acuityPill, { backgroundColor: color + '20' }]}>
        <Text style={[styles.acuityText, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderLeftWidth: 5,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 17, fontWeight: '700', color: '#11181C', flex: 1 },
  alertBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 8,
  },
  alertBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bed: { fontSize: 13, color: '#687076', marginTop: 2 },
  diagnosis: { fontSize: 14, color: '#374151', marginTop: 4 },
  acuityPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  acuityText: { fontSize: 11, fontWeight: '700' },
});
