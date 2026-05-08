/**
 * T020 — Camera capture screen.
 * Captures patient file photo, stores path in patients.last_photo_path.
 * No OCR in P1 — photo is reference only.
 * AC: photo path persists across app restart.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { documentDirectory, moveAsync } from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';

export default function CameraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => { getDb().then(setDb); }, []);

  if (!permission) {
    return <View style={styles.center}><Text>Checking camera permission…</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to photograph patient files.</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || !db || !id || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) throw new Error('No photo URI returned');

      const dest = `${documentDirectory}patient_${id}_${Date.now()}.jpg`;
      await moveAsync({ from: photo.uri, to: dest });

      await db.runAsync(
        'UPDATE patients SET last_photo_path = ?, updated_at = ? WHERE id = ?',
        [dest, new Date().toISOString(), id],
      );

      Alert.alert('Photo saved', 'Patient file photo attached.', [
        { text: 'Done', onPress: () => router.back() },
        { text: 'Take another', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Capture failed', String(err));
    } finally {
      setCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.overlay}>
          <Text style={styles.overlayHint}>Position patient file in frame</Text>
          <Pressable
            style={({ pressed }) => [styles.shutter, pressed && { opacity: 0.8 }, capturing && styles.shutterDisabled]}
            onPress={handleCapture}
            disabled={capturing}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permText: { fontSize: 16, color: '#374151', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#0a7ea4', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 48,
    gap: 20,
  },
  overlayHint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  shutter: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.4 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { color: '#fff', fontSize: 16 },
});
