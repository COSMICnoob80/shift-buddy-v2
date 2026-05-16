import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, useColorScheme } from 'react-native';
import OfflineIndicator from '../components/OfflineIndicator';
import { ThemeProvider, useTheme, setPreferredThemeCallback, ThemeMode } from '../theme/ThemeProvider';
import { getDb } from '../lib/db';

setPreferredThemeCallback(async () => {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'theme_mode'",
    );
    const val = row?.value as ThemeMode | undefined;
    if (val && ['light', 'dark', 'auto'].includes(val)) return val;
  } catch {
    // DB not ready yet, fall through to auto
  }
  return 'auto';
});

function RootLayoutNav() {
  const { colors, colorScheme } = useTheme();
  const systemColorScheme = useColorScheme();
  const statusBarContent = colorScheme === 'dark' || (colorScheme === 'auto' && systemColorScheme === 'dark') ? 'light' : 'dark';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerBackTitle: '',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerRight: () => (
            <View style={styles.headerRight}>
              <OfflineIndicator />
            </View>
          ),
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Doctor On Duty' }} />
        <Stack.Screen name="alerts/index" options={{ title: 'Alerts' }} />
        <Stack.Screen name="patients/index" options={{ title: 'Patients', headerLargeTitle: true }} />
        <Stack.Screen name="patients/add" options={{ title: 'Add Patient', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/index" options={{ title: 'Patient' }} />
        <Stack.Screen name="patients/[id]/vitals" options={{ title: 'Vitals', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/labs" options={{ title: 'Labs', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/camera" options={{ title: 'Camera', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/review" options={{ title: 'Review Data', presentation: 'modal' }} />
        <Stack.Screen name="protocols/index" options={{ title: 'Doctor On Duty' }} />
        <Stack.Screen name="protocols/[id]" options={{ title: 'Doctor On Duty 2021' }} />
        <Stack.Screen name="protocols/chapter/[chapterId]" options={{ title: 'Doctor On Duty' }} />
        <Stack.Screen name="protocols/calc/[type]" options={{ title: 'Calculator' }} />
        <Stack.Screen name="protocols/calc/universal" options={{ title: 'Dose Calculator' }} />
        <Stack.Screen name="patients/discharge" options={{ title: 'Discharge Patient', presentation: 'modal' }} />
        <Stack.Screen name="drugs/index" options={{ title: 'Drug Formulary' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
      <StatusBar style={statusBarContent} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  headerRight: { marginRight: 8 },
});
