import React, { useCallback, useEffect, useState } from 'react';
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
import PatientCard, { Acuity } from '../../components/PatientCard';

const ACUITY_ORDER: Record<string, number> = {
  critical: 0,
  urgent: 1,
  stable: 2,
  discharge_ready: 3,
};

interface PatientRow {
  id: string;
  name: string;
  bed_number: string;
  diagnosis: string;
  acuity: string;
  alert_count: number;
}

async function loadPatients(db: SQLiteDatabase): Promise<PatientRow[]> {
  const rows = await db.getAllAsync<PatientRow>(`
    SELECT p.id, p.name, p.bed_number, p.diagnosis, p.acuity,
           COUNT(CASE WHEN a.acknowledged = 0 THEN 1 END) AS alert_count
    FROM patients p
    LEFT JOIN alerts a ON a.patient_id = p.id
    WHERE p.status = 'admitted'
    GROUP BY p.id
    ORDER BY p.name
  `);
  return rows.sort(
    (a, b) =>
      (ACUITY_ORDER[a.acuity] ?? 99) - (ACUITY_ORDER[b.acuity] ?? 99),
  );
}

export default function PatientListScreen() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getDb().then(setDb);
  }, []);

  const refresh = useCallback(async () => {
    if (!db) return;
    setRefreshing(true);
    const rows = await loadPatients(db);
    setPatients(rows);
    setRefreshing(false);
  }, [db]);

  useEffect(() => {
    if (db) refresh();
  }, [db, refresh]);

  return (
    <View style={styles.container}>
      <FlatList
        data={patients}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <PatientCard
            id={item.id}
            name={item.name}
            bedNumber={item.bed_number}
            diagnosis={item.diagnosis}
            acuity={item.acuity as Acuity}
            alertCount={item.alert_count}
            onPress={() =>
              router.push({
                pathname: '/patients/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No admitted patients.</Text>
            <Text style={styles.emptyHint}>Tap + to add a patient.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        contentContainerStyle={styles.list}
      />
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
        onPress={() => router.push('/patients/add')}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { paddingVertical: 8, paddingBottom: 80 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  emptyHint: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '400', lineHeight: 32 },
});
