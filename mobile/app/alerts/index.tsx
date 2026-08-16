import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../lib/db';
import AlertBanner from '../../components/AlertBanner';
import { useTheme, Colors } from '../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

interface AlertRow {
  id: string;
  patient_id: string;
  severity: string;
  parameter: string;
  value: number;
  unit: string | null;
  message: string;
  acknowledged: number;
  patient_name: string;
  bed_number: string;
  created_at: string;
}

async function loadAlerts(db: SQLiteDatabase): Promise<AlertRow[]> {
  return db.getAllAsync<AlertRow>(`
    SELECT a.*, p.name AS patient_name, p.bed_number
    FROM alerts a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.acknowledged = 0
    ORDER BY
      CASE a.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      a.created_at DESC
  `);
}

export default function AlertsListScreen() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(setDb);
  }, []);

  const refresh = useCallback(async () => {
    if (!db) return;
    setRefreshing(true);
    setAlerts(await loadAlerts(db));
    setRefreshing(false);
  }, [db]);

  useEffect(() => {
    if (db) refresh();
  }, [db, refresh]);

  return (
    <View style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/patients/[id]',
                params: { id: item.patient_id },
              })
            }
          >
            <AlertBanner
              alert={{
                id: item.id,
                severity: item.severity,
                parameter: item.parameter,
                value: item.value,
                unit: item.unit,
                message: `${item.patient_name} — Bed ${item.bed_number}: ${item.message}`,
                created_at: item.created_at,
              }}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active alerts.</Text>
            <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
              Alerts appear when vitals or labs cross critical thresholds.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { paddingVertical: 8, paddingBottom: 24 },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '600' },
    emptyHint: { fontSize: 13, marginTop: 4 },
  });
}
