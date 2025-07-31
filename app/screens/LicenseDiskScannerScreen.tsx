import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface LicenseDiskScannerScreenProps {
  onScanComplete?: (licenseData: any) => void;
  onClose?: () => void;
}

const LicenseDiskScannerScreen: React.FC<LicenseDiskScannerScreenProps> = ({ 
  onScanComplete, 
  onClose 
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    // Camera permissions are still loading
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.message}>We need your permission to show the camera</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    try {
      // Process the scanned license data
      const licenseData = parseLicenseData(data);
      
      if (licenseData) {
        // Save to database
        const { error } = await supabase
          .from('license_scans')
          .insert([{
            license_number: licenseData.licenseNumber,
            scan_data: data,
            scan_type: type,
            scanned_at: new Date().toISOString()
          }]);

        if (error) {
          console.error('Error saving license scan:', error);
          Alert.alert('Error', 'Failed to save license data');
        } else {
          Alert.alert(
            'License Scanned',
            `License Number: ${licenseData.licenseNumber}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  onScanComplete?.(licenseData);
                  onClose?.();
                }
              }
            ]
          );
        }
      } else {
        Alert.alert(
          'Invalid License',
          'Could not parse license data. Please try again.',
          [
            {
              text: 'Try Again',
              onPress: () => setScanned(false)
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing license scan:', error);
      Alert.alert(
        'Error',
        'Failed to process license data',
        [
          {
            text: 'Try Again',
            onPress: () => setScanned(false)
          }
        ]
      );
    }
  };

  const parseLicenseData = (data: string) => {
    // This is a simple parser for license data
    // In a real implementation, you'd have specific parsing logic based on your license format
    try {
      // Example: assuming data contains license number in some format
      const lines = data.split('\n');
      let licenseNumber = '';
      
      // Look for patterns that might indicate a license number
      for (const line of lines) {
        const trimmedLine = line.trim();
        // Look for patterns like "DL" followed by numbers, or just a series of numbers/letters
        if (trimmedLine.match(/^[A-Z0-9]{6,}$/)) {
          licenseNumber = trimmedLine;
          break;
        }
        if (trimmedLine.includes('DL') || trimmedLine.includes('LIC')) {
          const match = trimmedLine.match(/[A-Z0-9]{6,}/);
          if (match) {
            licenseNumber = match[0];
            break;
          }
        }
      }
      
      if (licenseNumber) {
        return {
          licenseNumber,
          rawData: data,
          scannedAt: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing license data:', error);
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan License</Text>
        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
          <Ionicons name="camera-reverse" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <CameraView
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['pdf417', 'code128', 'code39', 'qr', 'datamatrix'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>
            Position the license within the frame
          </Text>
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.scannedOverlay}>
          <Text style={styles.scannedText}>Processing...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
          disabled={!scanned}
        >
          <Text style={[styles.rescanButtonText, { opacity: scanned ? 1 : 0.5 }]}>
            Scan Again
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  flipButton: {
    padding: 5,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scanFrame: {
    width: 300,
    height: 200,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  scannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  rescanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LicenseDiskScannerScreen;
