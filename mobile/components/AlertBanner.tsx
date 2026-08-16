import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme, Colors } from '../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

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
  onPressProtocol?: () => void;
}

export default function AlertBanner({ alert, onPressProtocol }: AlertBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCritical = alert.severity === 'critical';

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: isCritical ? colors.errorBg : colors.warningBg,
          borderLeftColor: isCritical ? colors.danger : colors.warning,
        },
      ]}
    >
      <Text style={[styles.severity, { color: isCritical ? colors.danger : colors.warning }]}>
        {'⚠ '}{alert.severity.toUpperCase()}
      </Text>
      <Text style={[styles.message, { color: colors.text }]}>{alert.message}</Text>
      {alert.unit ? (
        <Text style={[styles.value, { color: colors.textSecondary }]}>{alert.parameter}: {alert.value} {alert.unit}</Text>
      ) : null}
      {onPressProtocol && (
        <Pressable style={[styles.protocolBtn, { backgroundColor: colors.primary }]} onPress={onPressProtocol}>
          <Text style={styles.protocolBtnText}>Open Protocol</Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    banner: {
      borderRadius: 8,
      borderLeftWidth: 4,
      padding: 12,
      marginBottom: 8,
    },
    severity: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
    message: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
    value: { fontSize: 12, marginTop: 4 },
    protocolBtn: {
      marginTop: 8,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      alignSelf: 'flex-start',
    },
    protocolBtnText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  });
}
