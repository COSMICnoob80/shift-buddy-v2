import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useTheme } from '../theme/ThemeProvider';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      setOffline(state.isConnected === false);
    });
    return () => unsub();
  }, []);

  if (!offline) return null;

  return (
    <View style={[styles.badge, { backgroundColor: colors.warning }]}>
      <Text style={[styles.text, { color: colors.background }]}>● Offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  text: { fontSize: 12, fontWeight: '700' },
});
