import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import OfflineIndicator from '../components/OfflineIndicator';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

function RootLayoutNav() {
  const { colors, colorScheme } = useTheme();
  return (
    <>
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
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </>
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
