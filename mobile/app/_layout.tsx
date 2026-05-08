import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import OfflineIndicator from '../components/OfflineIndicator';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerBackTitle: '',
          headerRight: () => (
            <View style={styles.headerRight}>
              <OfflineIndicator />
            </View>
          ),
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="alerts/index" options={{ title: 'Alerts' }} />
        <Stack.Screen name="alerts/index" options={{ title: 'Alerts' }} />
        <Stack.Screen name="patients/index" options={{ title: 'Patients', headerLargeTitle: true }} />
        <Stack.Screen name="patients/add" options={{ title: 'Add Patient', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/index" options={{ title: 'Patient' }} />
        <Stack.Screen name="patients/[id]/vitals" options={{ title: 'Vitals', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/labs" options={{ title: 'Labs', presentation: 'modal' }} />
        <Stack.Screen name="patients/[id]/camera" options={{ title: 'Camera', presentation: 'modal' }} />
        <Stack.Screen name="protocols/index" options={{ title: 'Protocols' }} />
        <Stack.Screen name="protocols/[id]" options={{ title: 'Protocol' }} />
        <Stack.Screen name="protocols/calc/[type]" options={{ title: 'Calculator' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  headerRight: { marginRight: 8 },
});
