import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';
import { getSectionsInChapter, BookSection } from '../../../lib/book';
import { useTheme, Colors } from '../../../theme/ThemeProvider';

type ThemeColors = typeof Colors.light;

export default function ChapterBrowseScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [sections, setSections] = useState<BookSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    getDb().then(setDb);
  }, []);

  useEffect(() => {
    if (!db || !chapterId) return;
    getSectionsInChapter(db, chapterId).then((s) => {
      setSections(s);
      setLoading(false);
    });
  }, [db, chapterId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const chapterTitle = sections[0]?.chapterTitle ?? 'Chapter';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.breadcrumb}>Doctor On Duty / {chapterTitle}</Text>
        <Text style={styles.sectionCount}>{sections.length} sections</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            style={styles.sectionCard}
            onPress={() =>
              router.push({
                pathname: '/protocols/[id]',
                params: { id: item.id },
              })
            }
          >
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.sectionSnippet} numberOfLines={3}>
              {item.content.slice(0, 150).trim().replace(/\*\*/g, '')}
              {item.content.length > 150 ? '…' : ''}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No sections found in this chapter.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: colors.secondary,
    },
    breadcrumb: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    sectionCount: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    list: { paddingBottom: 40 },
    sectionCard: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    sectionSnippet: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    separator: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyText: { fontSize: 16, color: colors.textSecondary },
  });
}
