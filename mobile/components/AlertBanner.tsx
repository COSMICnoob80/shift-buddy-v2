import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Alert {
  id: string;
  severity: string;
  parameter: string;
  value: number;
  unit?: string | null;
  message: string;
  created_at: string;
}

interface AlertBannerProps {
  alert: Alert;
}

const SEVERITY_BG: Record<string, string> = {
  critical: '#fef2f2',
  warning: '#fffbeb',
};
const SEVERITY_BORDER: Record<string, string> = {
  critical: '#dc2626',
  warning: '#d97706',
};
const SEVERITY_TEXT: Record<string, string> = {
  critical: '#dc2626',
  warning: '#d97706',
};

export default function AlertBanner({ alert }: AlertBannerProps) {
  const bg = SEVERITY_BG[alert.severity] ?? '#f9fafb';
  const border = SEVERITY_BORDER[alert.severity] ?? '#6b7280';
  const textColor = SEVERITY_TEXT[alert.severity] ?? '#374151';

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderLeftColor: border }]}>
      <Text style={[styles.severity, { color: textColor }]}>
        ⚠ {alert.severity.toUpperCase()}
      </Text>
      <Text style={styles.message}>{alert.message}</Text>
      {alert.unit ? (
        <Text style={styles.value}>
          {alert.parameter}: {alert.value} {alert.unit}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderLeftWidth: 4,
    borderRadius: 6,
    padding: 10,
    marginVertical: 4,
  },
  severity: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  message: { fontSize: 14, color: '#111827', fontWeight: '500' },
  value: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
