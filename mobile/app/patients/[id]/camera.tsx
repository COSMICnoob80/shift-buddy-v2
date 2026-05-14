import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { SQLiteDatabase } from 'expo-sqlite';
import { getDb } from '../../../lib/db';

interface ExtractedValue {
  param: string;
  value: number;
  unit: string;
}

function mockExtract(text: string): ExtractedValue[] {
  const results: ExtractedValue[] = [];

  const hbMatch = text.match(/\b[Hh][Bb]\s*[:\s]\s*(\d+\.?\d*)/);
  if (hbMatch) results.push({ param: 'Hb', value: parseFloat(hbMatch[1]), unit: 'g/dL' });

  const kMatch = text.match(/\b[Kk][+]\s*[:\s]\s*(\d+\.?\d*)/);
  if (kMatch) results.push({ param: 'K+', value: parseFloat(kMatch[1]), unit: 'mmol/L' });

  const bpMatch = text.match(/\b[Bb][Pp]\s*[:\s]\s*(\d+)\s*\/\s*(\d+)/);
  if (bpMatch) {
    results.push({ param: 'Systolic BP', value: parseFloat(bpMatch[1]), unit: 'mmHg' });
    results.push({ param: 'Diastolic BP', value: parseFloat(bpMatch[2]), unit: 'mmHg' });
  }

  const crMatch = text.match(/\b[Cc][rR]\s*[:\s]\s*(\d+\.?\d*)/);
  if (crMatch) results.push({ param: 'Creatinine', value: parseFloat(crMatch[1]), unit: 'mg/dL' });

  const bsMatch = text.match(/\b[Rr][Bb][Ss]\s*[:\s]\s*(\d+\.?\d*)/);
  if (bsMatch) results.push({ param: 'Blood Sugar', value: parseFloat(bsMatch[1]), unit: 'mg/dL' });

  return results;
}

export default function CameraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedValue[]>([]);
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
      const dest = new File(Paths.document, `patient_${id}_${Date.now()}.jpg`);
      new File(photo.uri).move(dest);
      setPhotoUri(dest.uri);
      await db.runAsync(
        'UPDATE patients SET last_photo_path = ?, updated_at = ? WHERE id = ?',
        [dest.uri, new Date().toISOString(), id],
      );
      Alert.alert('Photo saved', 'Patient file photo attached.', [
        { text: 'Done', onPress: () => router.back() },
        { text: 'Extract Data', onPress: () => handleExtract() },
        { text: 'Take another', style: 'cancel' },
      ]);
    } catch (err) {
      Alert.alert('Capture failed', String(err));
    } finally {
      setCapturing(false);
    }
  }

  function handleExtract() {
    const mockText = 'Hb: 10.5, K+ 4.2, BP: 130/85, Cr 0.9, RBS 140';
    const values = mockExtract(mockText);
    setExtracted(values);
    if (values.length > 0) {
      router.push(
        `/patients/${id}/review?values=${encodeURIComponent(JSON.stringify(values))}` as any,
      );
    } else {
      Alert.alert('No Data Found', 'Could not extract lab values from this image. Try manual entry.');
    }
  }

  return (
    <View style={styles.container}>
      {photoUri ? (
        <View style={styles.center}>
          <Text style={{ fontSize: 16, color: '#374151', marginBottom: 16 }}>Photo captured successfully</Text>
          {extracted.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>Extracted Values:</Text>
              {extracted.map((e, i) => (
                <Text key={i}>{e.param}: {e.value} {e.unit}</Text>
              ))}
            </View>
          )}
          <Pressable style={[styles.btn, { backgroundColor: '#0a7ea4' }]} onPress={() => router.back()}>
            <Text style={styles.btnText}>Done</Text>
          </Pressable>
        </View>
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 24 },
  permText: { textAlign: 'center', marginBottom: 16, color: '#374151', fontSize: 15 },
  btn: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 60 },
  overlayHint: { color: '#fff', fontSize: 14, marginBottom: 24, backgroundColor: '#00000080', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', opacity: 0.9 },
  shutterDisabled: { opacity: 0.4 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: '#fff', fontSize: 16 },
});
