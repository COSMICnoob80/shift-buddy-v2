import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import dutyData from '../../assets/doctor-on-duty.json';

type Topic = { id: string; title: string; content: string };
type Chapter = { id: string; title: string; topics: Topic[] };

type FlatItem = {
  key: string;
  topicId: string;
  chapterTitle: string;
  topicTitle: string;
};

function buildFlatList(chapters: Chapter[]): FlatItem[] {
  return chapters.flatMap((ch) =>
    ch.topics.map((t) => ({
      key: `${ch.id}__${t.id}`,
      topicId: t.id,
      chapterTitle: ch.title,
      topicTitle: t.title,
    }))
  );
}

const ALL_ITEMS = buildFlatList(dutyData.chapters as Chapter[]);

export default function ProtocolListScreen() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter(
      (item) =>
        item.topicTitle.toLowerCase().includes(q) ||
        item.chapterTitle.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Protocols</Text>
      <TextInput
        style={styles.search}
        placeholder="Search protocols…"
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        testID="search-input"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() =>
              router.push({
                pathname: '/protocols/[id]',
                params: { id: item.topicId },
              })
            }
          >
            <Text style={styles.chapterLabel}>{item.chapterTitle}</Text>
            <Text style={styles.topicLabel}>{item.topicTitle}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No protocols found.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 16 },
  heading: { fontSize: 22, fontWeight: '700', marginHorizontal: 16, marginBottom: 8 },
  search: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111',
  },
  item: { paddingHorizontal: 16, paddingVertical: 12 },
  chapterLabel: { fontSize: 11, color: '#0a7ea4', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  topicLabel: { fontSize: 16, color: '#11181C' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
  empty: { marginTop: 32, textAlign: 'center', color: '#888' },
});
