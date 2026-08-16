import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';
import { searchDrugs, DrugRow, parseBrands } from '../../../lib/drugs';
import { uuid } from '../../../lib/uuid';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

export interface Medication {
  id: string;
  drugName: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  notes: string;
}

const ROUTES = ['PO', 'IV', 'IM', 'SC', 'SL', 'PR', 'INH', 'TOP', 'NG', 'IVI'];
const FREQUENCIES = ['STAT', 'OD', 'BD', 'TDS', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'HS', 'PRN'];

const RENAL_TOXIC_DRUGS = new Set([
  'gentamicin', 'tobramycin', 'amikacin', 'vancomycin',
  'spironolactone', 'enalapril', 'lisinopril', 'ramipril',
  'ibuprofen', 'naproxen', 'diclofenac', 'indomethacin',
  'celecoxib', 'metformin', 'tenofovir', 'acyclovir',
]);

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isRenalToxic(drugName: string): boolean {
  const n = normalize(drugName);
  for (const toxic of RENAL_TOXIC_DRUGS) {
    if (n.includes(toxic)) return true;
  }
  return false;
}

export default function MedicationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [hasAki, setHasAki] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DrugRow[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<DrugRow | null>(null);
  const [dose, setDose] = useState('');
  const [route, setRoute] = useState('PO');
  const [frequency, setFrequency] = useState('BD');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [searching, setSearching] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(async (database) => {
      setDb(database);
      const row = await database.getFirstAsync<{ current_medications: string | null }>(
        'SELECT current_medications FROM patients WHERE id = ?',
        [id],
      );
      if (row?.current_medications) {
        try {
          const parsed = JSON.parse(row.current_medications) as Medication[];
          setMedications(parsed);
        } catch { /* invalid JSON — reset */ }
      }
      const akiAlert = await database.getFirstAsync(
        `SELECT 1 FROM alerts WHERE patient_id = ? AND parameter = 'Creatinine' AND acknowledged = 0 LIMIT 1`,
        [id],
      );
      setHasAki(akiAlert !== null);
    });
  }, [id]);

  const handleSearch = useCallback(async (text: string) => {
    setSearchQuery(text);
    setSelectedDrug(null);
    if (!db || text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const hits = await searchDrugs(db, text);
    setSearchResults(hits);
    setSearching(false);
  }, [db]);

  const handleSelectDrug = useCallback((drug: DrugRow) => {
    setSelectedDrug(drug);
    setSearchQuery(drug.genericName);
    setSearchResults([]);
  }, []);

  async function saveMedications(updated: Medication[]) {
    if (!db || !id) return;
    await db.runAsync(
      'UPDATE patients SET current_medications = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(updated), new Date().toISOString(), id],
    );
    setMedications(updated);
  }

  const handleAddMed = useCallback(async () => {
    if (!selectedDrug && !searchQuery.trim()) { Alert.alert('Search and select a drug'); return; }
    if (!dose.trim()) { Alert.alert('Enter dose'); return; }
    const med: Medication = {
      id: uuid(),
      drugName: selectedDrug?.genericName ?? searchQuery.trim(),
      dose: dose.trim(),
      route,
      frequency,
      startDate,
      notes: notes.trim(),
    };
    const updated = [...medications, med];
    await saveMedications(updated);
    setShowAdd(false);
    resetForm();
  }, [selectedDrug, searchQuery, dose, route, frequency, startDate, notes, medications]);

  function resetForm() {
    setSelectedDrug(null);
    setSearchQuery('');
    setSearchResults([]);
    setDose('');
    setRoute('PO');
    setFrequency('BD');
    setStartDate(new Date().toISOString().slice(0, 10));
    setNotes('');
  }

  function handleRemove(id: string) {
    Alert.alert('Remove Medication', 'Remove this medication from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = medications.filter((m) => m.id !== id);
          await saveMedications(updated);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Medications</Text>
        {hasAki && (
          <Text style={[styles.akiBanner, { backgroundColor: colors.errorBg, color: colors.danger }]}>
            AKI active — renally toxic drugs highlighted
          </Text>
        )}
      </View>

      {/* Medication List */}
      <FlatList
        data={medications}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => {
          const toxic = hasAki && isRenalToxic(item.drugName);
          return (
            <Pressable
              style={[
                styles.medCard,
                { backgroundColor: colors.cardBackground, borderLeftColor: toxic ? colors.danger : colors.primary },
                toxic && { borderLeftWidth: 4 },
              ]}
              onLongPress={() => handleRemove(item.id)}
            >
              <View style={styles.medRow}>
                <Text style={[styles.medName, { color: colors.text }]}>{item.drugName}</Text>
                {toxic && <Text style={[styles.toxicBadge, { backgroundColor: colors.errorBg, color: colors.danger }]}>Renal tox</Text>}
              </View>
              <Text style={[styles.medDetail, { color: colors.textSecondary }]}>
                {item.dose} {item.route} · {item.frequency}
              </Text>
              {item.notes ? (
                <Text style={[styles.medNotes, { color: colors.textTertiary }]}>{item.notes}</Text>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No medications added</Text>
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4 }}>Tap + to add from formulary</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      {/* FAB */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAdd(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Add Medication Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.secondary, borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { setShowAdd(false); resetForm(); }}>
              <Text style={[styles.modalCancel, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Medication</Text>
            <Pressable onPress={handleAddMed}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Add</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Search Drug Formulary</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Type drug name (generic or brand)"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {searching && <Text style={{ color: colors.textSecondary, marginVertical: 8 }}>Searching…</Text>}

            {searchResults.length > 0 && (
              <View style={[styles.searchResults, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {searchResults.map((drug) => (
                  <Pressable
                    key={drug.id}
                    style={({ pressed }) => [
                      styles.drugRow,
                      { borderBottomColor: colors.border },
                      pressed && { backgroundColor: colors.cardBackground },
                    ]}
                    onPress={() => handleSelectDrug(drug)}
                  >
                    <Text style={[styles.drugName, { color: colors.text }]}>{drug.genericName}</Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                      {parseBrands(drug.brandNames).slice(0, 2).join(', ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {selectedDrug && (
              <View style={[styles.selectedDrug, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
                <Text style={[styles.selectedDrugText, { color: colors.success }]}>{selectedDrug.genericName}</Text>
                <Text style={{ fontSize: 12, color: colors.textTertiary }}>{parseBrands(selectedDrug.brandNames).join(', ')}</Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.textSecondary }]}>Dose</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
              value={dose}
              onChangeText={setDose}
              placeholder="e.g. 500mg, 10 units, 1 amp"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Route</Text>
            <View style={styles.chipRow}>
              {ROUTES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, { borderColor: colors.border }, route === r && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
                  onPress={() => setRoute(r)}
                >
                  <Text style={[styles.chipText, { color: colors.text }, route === r && { color: colors.primary, fontWeight: '700' }]}>{r}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Frequency</Text>
            <View style={styles.chipRow}>
              {FREQUENCIES.map((f) => (
                <Pressable
                  key={f}
                  style={[styles.chip, { borderColor: colors.border }, frequency === f && { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.chipText, { color: colors.text }, frequency === f && { color: colors.primary, fontWeight: '700' }]}>{f}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.multiline, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.inputBorder }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Hold if K+ < 3.5, give with food"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    akiBanner: { fontSize: 12, fontWeight: '600', padding: 8, borderRadius: 6, marginTop: 8, overflow: 'hidden' },
    list: { paddingVertical: 8, paddingBottom: 80 },
    medCard: {
      borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 6,
      borderLeftWidth: 3, elevation: 1,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    },
    medRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    medName: { fontSize: 15, fontWeight: '700' },
    medDetail: { fontSize: 13, marginTop: 2 },
    medNotes: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
    toxicBadge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, fontWeight: '600' },
    fab: {
      position: 'absolute', bottom: 24, right: 20,
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
      elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
    },
    fabText: { color: '#fff', fontSize: 28, fontWeight: '400', lineHeight: 30 },
    modalContainer: { flex: 1 },
    modalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
    },
    modalCancel: { fontSize: 16 },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    modalSave: { fontSize: 16, fontWeight: '700' },
    label: { fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    multiline: { height: 70, textAlignVertical: 'top' },
    searchResults: { borderWidth: 1, borderRadius: 8, marginTop: 4, maxHeight: 180 },
    drugRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
    drugName: { fontSize: 14, fontWeight: '600' },
    selectedDrug: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8 },
    selectedDrugText: { fontSize: 14, fontWeight: '700' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontSize: 13 },
  });
}
