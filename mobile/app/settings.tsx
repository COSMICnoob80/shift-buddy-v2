import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getDb } from '../lib/db';
import { useTheme, Colors, ThemeMode } from '../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

export default function SettingsScreen() {
  const { colors, colorScheme, setThemeMode } = useTheme();
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(colorScheme);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    setSelectedMode(colorScheme);
  }, [colorScheme]);

  async function saveThemeMode(mode: ThemeMode) {
    setSelectedMode(mode);
    setThemeMode(mode);
    try {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme_mode', ?)",
        [mode],
      );
    } catch {
      Alert.alert('Error', 'Could not save theme preference.');
    }
  }

  async function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all patients, vitals, labs, alerts, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDb();
              await db.execAsync('DELETE FROM alerts');
              await db.execAsync('DELETE FROM lab_results');
              await db.execAsync('DELETE FROM vitals');
              await db.execAsync('DELETE FROM patients');
              Alert.alert('Done', 'All patient data has been cleared.');
            } catch {
              Alert.alert('Error', 'Could not clear data.');
            }
          },
        },
      ],
    );
  }

  const themeOptions: { mode: ThemeMode; label: string; description: string }[] = [
    { mode: 'light', label: 'Light', description: 'Always use light theme' },
    { mode: 'dark', label: 'Dark', description: 'Always use dark theme' },
    { mode: 'auto', label: 'Auto (System)', description: 'Follow device settings' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        {themeOptions.map((opt) => (
          <Pressable
            key={opt.mode}
            style={[
              styles.radioRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedMode === opt.mode && { borderColor: colors.primary },
            ]}
            onPress={() => saveThemeMode(opt.mode)}
          >
            <View style={[styles.radioOuter, { borderColor: colors.textSecondary }]}>
              {selectedMode === opt.mode && (
                <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
              )}
            </View>
            <View style={styles.radioTextContainer}>
              <Text style={[styles.radioLabel, { color: colors.text }]}>{opt.label}</Text>
              <Text style={[styles.radioDesc, { color: colors.textTertiary }]}>{opt.description}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App Info</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.appName, { color: colors.text }]}>Shift Buddy — Clinical Co-Pilot</Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>Version 0.5.0</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Data</Text>
        <Pressable
          style={[styles.dangerBtn, { backgroundColor: colors.errorBg, borderColor: colors.danger }]}
          onPress={handleClearData}
        >
          <Text style={[styles.dangerBtnText, { color: colors.danger }]}>Clear all patient data</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    radioRow: {
      flexDirection: 'row', alignItems: 'center', padding: 14,
      borderRadius: 10, borderWidth: 1, marginBottom: 8,
    },
    radioOuter: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    radioInner: { width: 12, height: 12, borderRadius: 6 },
    radioTextContainer: { flex: 1 },
    radioLabel: { fontSize: 15, fontWeight: '600' },
    radioDesc: { fontSize: 12, marginTop: 2 },
    infoCard: { padding: 16, borderRadius: 10, borderWidth: 1 },
    appName: { fontSize: 16, fontWeight: '700' },
    version: { fontSize: 13, marginTop: 4 },
    dangerBtn: { padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
    dangerBtnText: { fontSize: 15, fontWeight: '600' },
  });
}
