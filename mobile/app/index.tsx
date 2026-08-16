import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../lib/db';
import { searchBook, getChapterIndex, SearchResult } from '../lib/book';
import { useTheme, Colors } from '../theme/ThemeProvider';

type ChapterRow = {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  sectionCount: number;
};

export default function ProtocolListScreen() {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(async (database) => {
      setDb(database);
      await loadChapters(database);
      setLoading(false);
    });
  }, []);

  async function loadChapters(database: SQLiteDatabase) {
    const idx = await getChapterIndex(database);
    setChapters(idx);
    if (idx.length === 0) {
      await new Promise((r) => setTimeout(r, 500));
      const retry = await getChapterIndex(database);
      if (retry.length > 0) setChapters(retry);
    }
  }

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      if (!db || text.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      const hits = await searchBook(db, text);
      setResults(hits);
      setSearching(false);
    },
    [db],
  );

  const isSearching = query.trim().length >= 2;
  const sectionCount = chapters.reduce((sum, ch) => sum + ch.sectionCount, 0);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingTitle, { color: colors.text }]}>Doctor On Duty</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 6 }}>Loading clinical protocols…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.secondary }]}>
        <View>
          <Text style={[styles.brand, { color: colors.text }]}>Doctor On Duty</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            {chapters.length} chapters · {sectionCount} sections
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            style={[styles.settingsBtn, { backgroundColor: colors.icon + '30' }]}
            onPress={() => router.push('/settings' as any)}
          >
            <Text style={[styles.settingsBtnText, { color: colors.text }]}>⚙</Text>
          </Pressable>
          <Pressable
            style={[styles.patientsBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/patients' as any)}
          >
            <Text style={styles.patientsBtnText}>Patients</Text>
          </Pressable>
          <Pressable
            style={[styles.drugsBtn, { backgroundColor: colors.success }]}
            onPress={() => router.push('/drugs' as any)}
          >
            <Text style={styles.drugsBtnText}>Drugs</Text>
          </Pressable>
        </View>
      </View>

      <TextInput
        style={[styles.search, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
        placeholder="Search full book — hyperkalemia, DKA, chest pain, UTI…"
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={handleSearch}
        autoCorrect={false}
        autoCapitalize="none"
        testID="search-input"
      />

      {searching && (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
      )}

      <FlatList<SearchResult | ChapterRow>
        data={isSearching ? results as (SearchResult | ChapterRow)[] : chapters as (SearchResult | ChapterRow)[]}
        keyExtractor={(item, _idx) => ('chapterId' in item ? item.chapterId : item.id)}
        renderItem={({ item }) => {
          if ('chapterId' in item) {
            return (
              <Pressable
                style={styles.chapterCard}
                onPress={() =>
                  router.push({
                    pathname: '/protocols/chapter/[chapterId]',
                    params: { chapterId: item.chapterId },
                  })
                }
              >
                <Text style={[styles.chapterNumber, { color: colors.primary, backgroundColor: colors.primary + '18' }]}>
                  Ch {item.chapterNumber}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chapterTitle, { color: colors.text }]}>{item.chapterTitle}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {item.sectionCount} section{item.sectionCount !== 1 ? 's' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              style={styles.resultItem}
              onPress={() =>
                router.push({
                  pathname: '/protocols/[id]',
                  params: { id: item.id },
                })
              }
            >
              <Text style={[styles.chapterLabel, { color: colors.primary }]}>{item.chapterTitle}</Text>
              <Text style={[styles.resultTitle, { color: colors.text }]}>{item.title}</Text>
              {item.snippet ? (
                <Text style={[styles.snippet, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.snippet}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListEmptyComponent={
          !searching && query.trim().length >= 2 ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>{'No results for "'}{query}{'"'}</Text>
              <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                Try: hyperkalemia, DKA, AKI, chest pain, sepsis, UTI, appendicitis,
                meningitis, stroke
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function createStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 12,
    },
    brand: { fontSize: 24, fontWeight: '800' },
    loadingTitle: { fontSize: 24, fontWeight: '800', marginTop: 16 },
    patientsBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
    patientsBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    drugsBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginTop: 4 },
    drugsBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    headerButtons: { flexDirection: 'row', gap: 8 },
    settingsBtn: { borderRadius: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    settingsBtnText: { fontSize: 18 },
    search: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
    },
    list: { paddingBottom: 40 },
    chapterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    chapterNumber: {
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      overflow: 'hidden',
    },
    chapterTitle: { fontSize: 15, fontWeight: '600' },
    resultItem: { paddingHorizontal: 16, paddingVertical: 12 },
    chapterLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 3 },
    resultTitle: { fontSize: 15, fontWeight: '600' },
    snippet: { fontSize: 13, marginTop: 4, lineHeight: 18 },
    separator: { height: 1, marginLeft: 16 },
    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontWeight: '600' },
    emptyHint: { fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  });
}
