// components/camera/VisionCamera.tsx
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

interface VisionCameraProps {
  onCodeScanned: (data: string) => void;
  isActive: boolean;
  style?: any;
  children?: React.ReactNode;
}

const VisionCamera: React.FC<VisionCameraProps> = ({ onCodeScanned, isActive, style, children }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');

  // Enhanced code scanner configuration for SA license disks
  const codeScanner = useCodeScanner({
    codeTypes: ['pdf-417', 'code-128', 'code-39', 'ean-13', 'ean-8', 'qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        console.log('📱 Barcode detected:', codes[0].value);
        onCodeScanned(codes[0].value);
      }
    },
  });

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const permission = await Camera.requestCameraPermission();
        setHasPermission(permission === 'granted');
        
        if (permission === 'denied') {
          Alert.alert(
            'Camera Permission Required',
            'Please enable camera permission in your device settings to use the scanner.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        setHasPermission(false);
      }
    };

    getCameraPermission();
  }, []);

  if (!hasPermission) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.message}>Camera permission required for scanning</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.message}>No camera device found</Text>
      </View>
    );
  }

  return (
    <Camera
      style={[styles.camera, style]}
      device={device}
      isActive={isActive}
      codeScanner={codeScanner}
    >
      {children}
    </Camera>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
});

export default VisionCamera;
