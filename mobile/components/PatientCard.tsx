import React from 'react';
import { Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

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
  id,
  name,
  bedNumber,
  diagnosis,
  acuity,
  alertCount,
  onPress,
  onLongPress,
}: PatientCardProps) {
  const { colors } = useTheme();
  const acuityColorKey = ACUITY_COLOR_KEYS[acuity] as keyof typeof colors;
  const color = colors[acuityColorKey] || colors.icon;
  const label = ACUITY_LABEL[acuity] ?? acuity.toUpperCase();

  const handleLongPress = () => {
    Alert.alert(
      'Discharge Patient',
      `Are you sure you want to discharge ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discharge', style: 'destructive', onPress: () => onLongPress(id) },
      ],
      { cancelable: true }
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
      <Text style={[styles.diagnosis, { color: colors.text }]}>
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
  name: { fontSize: 17, fontWeight: '700', flex: 1 },
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
  bed: { fontSize: 13, marginTop: 2 },
  diagnosis: { fontSize: 14, marginTop: 4 },
  acuityPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  acuityText: { fontSize: 11, fontWeight: '700' },
});
