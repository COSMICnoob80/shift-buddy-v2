import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../lib/db';
import {
  searchDrugs,
  getDrugCategories,
  getDrugsByCategory,
  DrugRow,
  parseBrands,
} from '../../lib/drugs';
import { useTheme, Colors } from '../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

export default function DrugListScreen() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DrugRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categoryDrugs, setCategoryDrugs] = useState<DrugRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(async (database) => {
      setDb(database);
      const cats = await getDrugCategories(database);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      setActiveCategory(null);
      setCategoryDrugs([]);
      if (!db || text.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      const hits = await searchDrugs(db, text);
      setResults(hits);
      setSearching(false);
    },
    [db],
  );

  const handleCategory = useCallback(
    async (cat: string) => {
      if (!db) return;
      setQuery('');
      setResults([]);
      setActiveCategory(cat === activeCategory ? null : cat);
      if (cat === activeCategory) {
        setCategoryDrugs([]);
      } else {
        setSearching(true);
        const drugs = await getDrugsByCategory(db, cat);
        setCategoryDrugs(drugs);
        setSearching(false);
      }
    },
    [db, activeCategory],
  );

  const isSearching = query.trim().length >= 2;
  const displayData = isSearching ? results : activeCategory ? categoryDrugs : [];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>Loading drug formulary…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.brand, { color: colors.text }]}>Drug Formulary</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Pakistan drug brands · Offline</Text>
      </View>

      <TextInput
        style={[styles.search, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
        placeholder="Search drug (generic or brand name)…"
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={handleSearch}
        autoCorrect={false}
        autoCapitalize="none"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, marginBottom: 8 }}>
        <View style={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' }}>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.chip,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                activeCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => handleCategory(cat)}
            >
              <Text style={[
                styles.chipText,
                { color: colors.text },
                activeCategory === cat && { color: colors.background },
              ]}>{cat}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {searching && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
      )}

      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const brands = parseBrands(item.brandNames);
          return (
            <Pressable
              style={styles.drugCard}
              onPress={() => {
                if (item.chapterRef) {
                  router.push({
                    pathname: '/protocols/[id]',
                    params: { id: item.chapterRef },
                  });
                }
              }}
            >
              <Text style={[styles.genericName, { color: colors.text }]}>{item.genericName}</Text>
              <Text style={{ fontSize: 13, color: colors.primary, marginTop: 2 }}>{brands.join(', ')}</Text>
              <View style={styles.metaRow}>
                {item.category && (
                  <Text style={[styles.metaTag, { color: colors.textSecondary, backgroundColor: colors.cardBackground }]}>{item.category}</Text>
                )}
                {item.route && (
                  <Text style={{ fontSize: 11, color: colors.textTertiary }}>{item.route}</Text>
                )}
                {item.isPaediatric ? (
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success, backgroundColor: colors.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' }}>Peds</Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          !searching && !activeCategory ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Search a drug or tap a category above</Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>Try: paracetamol, amoxicillin, ibuprofen, insulin</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
    brand: { fontSize: 24, fontWeight: '800' },
    search: {
      marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10, fontSize: 16,
    },
    chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
    chipText: { fontSize: 13, fontWeight: '600' },
    drugCard: { paddingHorizontal: 16, paddingVertical: 12 },
    genericName: { fontSize: 15, fontWeight: '700' },
    metaRow: { flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' },
    metaTag: { fontSize: 11, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    separator: { height: 1, marginLeft: 16 },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
    emptyHint: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  });
}
