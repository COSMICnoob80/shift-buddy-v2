import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import dutyData from '../../assets/doctor-on-duty.json';

type Topic = { id: string; title: string; content: string };
type Chapter = { id: string; title: string; topics: Topic[] };

function findTopic(id: string): { topic: Topic; chapter: Chapter } | null {
  for (const chapter of dutyData.chapters as Chapter[]) {
    const topic = chapter.topics.find((t) => t.id === id);
    if (topic) return { topic, chapter };
  }
  return null;
}

export default function ProtocolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const result = id ? findTopic(id) : null;

  if (!result) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Protocol not found.</Text>
      </View>
    );
  }

  const { topic, chapter } = result;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.chapterLabel}>{chapter.title}</Text>
      <Text style={styles.title}>{topic.title}</Text>
      <Text style={styles.body}>{topic.content}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  chapterLabel: {
    fontSize: 11,
    color: '#0a7ea4',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#11181C', marginBottom: 16 },
  body: { fontSize: 16, lineHeight: 26, color: '#11181C' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#888' },
});
