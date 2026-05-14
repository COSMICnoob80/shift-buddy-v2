import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../lib/db';
import { getBookSection, BookSection } from '../../lib/book';

function renderContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<View key={key} style={{ height: 8 }} />);
      key++;
      continue;
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <Text key={key} style={styles.boldHeading}>{trimmed.replace(/\*\*/g, '')}</Text>,
      );
      key++;
      continue;
    }

    if (trimmed.startsWith('- ')) {
      elements.push(
        <View key={key} style={styles.listItem}>
          <Text style={styles.bullet}>{'\u2022'} </Text>
          <Text style={styles.listText}>{renderInline(trimmed.slice(2))}</Text>
        </View>,
      );
      key++;
      continue;
    }

    if (/^\d+\./.test(trimmed)) {
      elements.push(
        <View key={key} style={styles.listItem}>
          <Text style={styles.bullet}>  </Text>
          <Text style={styles.listText}>{renderInline(trimmed.replace(/^\d+\.\s*/, ''))}</Text>
        </View>,
      );
      key++;
      continue;
    }

    elements.push(
      <Text key={key} style={styles.body}>{renderInline(trimmed)}</Text>,
    );
    key++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

export default function ProtocolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [section, setSection] = useState<BookSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDb().then(setDb);
  }, []);

  useEffect(() => {
    if (!db || !id) return;
    getBookSection(db, id).then((s) => {
      setSection(s);
      setLoading(false);
    });
  }, [db, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (!section) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Section not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.chapterLabel}>{section.chapterTitle}</Text>
      <Text style={styles.title}>{section.title}</Text>
      {renderContent(section.content)}
      <Text style={styles.source}>Source: Doctor On Duty 2021</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chapterLabel: {
    fontSize: 11,
    color: '#0a7ea4',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#11181C', marginBottom: 16 },
  body: { fontSize: 15, lineHeight: 24, color: '#374151', marginBottom: 2 },
  bold: { fontWeight: '700' },
  boldHeading: { fontSize: 15, fontWeight: '700', color: '#11181C', marginTop: 8, marginBottom: 4 },
  listItem: { flexDirection: 'row', paddingRight: 16, marginBottom: 2 },
  bullet: { fontSize: 15, lineHeight: 24, color: '#374151', width: 14 },
  listText: { fontSize: 15, lineHeight: 24, color: '#374151', flex: 1 },
  source: { fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 24, textAlign: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, color: '#888' },
});