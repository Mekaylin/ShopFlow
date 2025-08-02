import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import PlatformCamera from '../../components/camera/PlatformCamera';

interface LicenseDiskScannerScreenProps {
  onScanComplete?: (licenseData: any) => void;
  onClose?: () => void;
}

interface LicenseData {
  licenseNumber: string;
  province: string;
  expiryDate: string;
  vehicleType: string;
  rawData: string;
  scannedAt: string;
}

const LicenseDiskScannerScreen: React.FC<LicenseDiskScannerScreenProps> = ({ 
  onScanComplete, 
  onClose 
}) => {
  const [isScanning, setIsScanning] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const parseSouthAfricanLicenseData = (rawData: string): LicenseData | null => {
    try {
      console.log('Raw license data:', rawData);
      
      // South African license disk PDF417 typically contains pipe-separated values
      // Format example: "GP|ABC123GP|2024-12|CAR|..."
      const parts = rawData.split('|');
      
      if (parts.length < 2) {
        // Try alternative parsing for different formats
        const lines = rawData.split('\n').map(line => line.trim()).filter(line => line);
        
        // Look for license number patterns (e.g., ABC123GP, 123ABC456)
        let licenseNumber = '';
        let province = '';
        let expiryDate = '';
        
        for (const line of lines) {
          // License number pattern: letters + numbers + optional province code
          const licenseMatch = line.match(/([A-Z]{2,3}\d{3,6}[A-Z]{0,2})/);
          if (licenseMatch && !licenseNumber) {
            licenseNumber = licenseMatch[1];
            
            // Extract province from license number
            const provinceMatch = licenseNumber.match(/([A-Z]{2})$/);
            if (provinceMatch) {
              province = provinceMatch[1];
            }
          }
          
          // Date pattern: YYYY-MM or MM/YYYY
          const dateMatch = line.match(/(\d{4}-\d{2}|\d{2}\/\d{4})/);
          if (dateMatch && !expiryDate) {
            expiryDate = dateMatch[1];
          }
        }
        
        if (licenseNumber) {
          return {
            licenseNumber,
            province: province || 'Unknown',
            expiryDate: expiryDate || 'Unknown',
            vehicleType: 'Motor Vehicle',
            rawData,
            scannedAt: new Date().toISOString()
          };
        }
      } else {
        // Standard pipe-separated format
        const [province, licenseNumber, expiryDate, vehicleType] = parts;
        
        return {
          licenseNumber: licenseNumber || 'Unknown',
          province: province || 'Unknown',
          expiryDate: expiryDate || 'Unknown',
          vehicleType: vehicleType || 'Motor Vehicle',
          rawData,
          scannedAt: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing license data:', error);
      return null;
    }
  };

  const handleCodeScanned = useCallback((data: string) => {
    if (!isScanning || isProcessing) return;
    
    setIsProcessing(true);
    setIsScanning(false);
    
    try {
      const licenseData = parseSouthAfricanLicenseData(data);
      
      if (licenseData) {
        // Save to database
        supabase
          .from('license_scans')
          .insert([{
            license_number: licenseData.licenseNumber,
            scan_data: licenseData.rawData,
            scan_type: 'pdf-417',
            vehicle_type: licenseData.vehicleType,
            province: licenseData.province,
            expiry_date: licenseData.expiryDate,
            scanned_at: licenseData.scannedAt
          }])
          .then(({ error }) => {
            if (error) {
              console.error('Error saving license scan:', error);
            }
            
            Alert.alert(
              'License Disk Scanned',
              `License: ${licenseData.licenseNumber}\nProvince: ${licenseData.province}\nExpiry: ${licenseData.expiryDate}`,
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
          });
      } else {
        Alert.alert(
          'Invalid License Disk',
          'Could not parse license disk data. Please try again.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                setIsProcessing(false);
                setIsScanning(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing license data:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process the scanned license disk.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setIsProcessing(false);
              setIsScanning(true);
            }
          }
        ]
      );
    }
  }, [isScanning, isProcessing, onScanComplete, onClose]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan License Disk</Text>
        <TouchableOpacity 
          style={styles.rescanButton} 
          onPress={() => {
            setIsScanning(true);
            setIsProcessing(false);
          }}
        >
          <Ionicons name="refresh" size={30} color="white" />
        </TouchableOpacity>
      </View>

      <PlatformCamera
        style={styles.camera}
        isActive={isScanning}
        onCodeScanned={handleCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>
            Position the South African license disk within the frame
          </Text>
          <Text style={styles.subInstructionText}>
            Looking for PDF417 barcode
          </Text>
        </View>
      </PlatformCamera>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <Text style={styles.processingText}>Processing license disk...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Hold steady and ensure good lighting for best results
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    padding: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rescanButton: {
    padding: 10,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 180,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 10,
  },
  subInstructionText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 5,
    padding: 5,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  footerText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LicenseDiskScannerScreen;
