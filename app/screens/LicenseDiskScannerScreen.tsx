import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PlatformCamera from '../../components/camera/PlatformCamera';
import { supabase } from '../../lib/supabase';

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
      console.log('🔍 Parsing SA license data:', rawData);
      
      // Enhanced South African license disk parsing
      // SA license disks use PDF417 barcodes with structured data
      
      // Remove special characters and normalize
      const cleanData = rawData.replace(/[^\w\s|\/\-:.]/g, '');
      
      // Try pipe-separated format first (standard PDF417)
      const parts = cleanData.split('|');
      
      if (parts.length >= 4) {
        // Standard SA format: Province|LicenseNumber|ExpiryDate|VehicleType|...
        const [province, licenseNumber, expiryDate, vehicleType, ...rest] = parts;
        
        return {
          licenseNumber: licenseNumber?.trim() || 'Unknown',
          province: mapProvinceCode(province?.trim()) || 'Unknown',
          expiryDate: formatSADate(expiryDate?.trim()) || 'Unknown',
          vehicleType: mapVehicleType(vehicleType?.trim()) || 'Motor Vehicle',
          rawData,
          scannedAt: new Date().toISOString()
        };
      }
      
      // Alternative parsing for non-standard formats
      const lines = cleanData.split(/[\n\r|]/).map(line => line.trim()).filter(line => line);
      
      let licenseNumber = '';
      let province = '';
      let expiryDate = '';
      let vehicleType = 'Motor Vehicle';
      
      for (const line of lines) {
        // Enhanced SA license number patterns
        // Examples: ABC123GP, 123ABC456, CA123456, DDD123WC
        const licensePatterns = [
          /([A-Z]{2,3}\d{3,6}[A-Z]{2})/,  // ABC123GP format
          /(\d{3}[A-Z]{3}\d{3})/,         // 123ABC456 format
          /([A-Z]{2}\d{6})/,              // CA123456 format
          /([A-Z]{3}\d{3}[A-Z]{2})/       // DDD123WC format
        ];
        
        for (const pattern of licensePatterns) {
          const match = line.match(pattern);
          if (match && !licenseNumber) {
            licenseNumber = match[1];
            
            // Extract province code from license number
            const provinceFromLicense = extractProvinceFromLicense(licenseNumber);
            if (provinceFromLicense) {
              province = provinceFromLicense;
            }
            break;
          }
        }
        
        // Enhanced date patterns for SA format
        const datePatterns = [
          /(\d{4}[-\/]\d{2}[-\/]\d{2})/,    // YYYY-MM-DD or YYYY/MM/DD
          /(\d{2}[-\/]\d{2}[-\/]\d{4})/,    // DD-MM-YYYY or DD/MM/YYYY
          /(\d{4}[-\/]\d{2})/,              // YYYY-MM
          /(\d{2}[-\/]\d{4})/               // MM/YYYY
        ];
        
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match && !expiryDate) {
            expiryDate = formatSADate(match[1]);
            break;
          }
        }
        
        // Vehicle type detection
        const vehicleTypes = ['MOTOR VEHICLE', 'MOTORCYCLE', 'TRAILER', 'BUS', 'TRUCK', 'TAXI'];
        const foundType = vehicleTypes.find(type => 
          line.toUpperCase().includes(type)
        );
        if (foundType) {
          vehicleType = foundType;
        }
      }
      
      if (licenseNumber) {
        return {
          licenseNumber,
          province: province || 'Unknown',
          expiryDate: expiryDate || 'Unknown',
          vehicleType,
          rawData,
          scannedAt: new Date().toISOString()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error parsing license data:', error);
      return null;
    }
  };

  // Helper function to map SA province codes
  const mapProvinceCode = (code: string): string => {
    const provinceCodes: Record<string, string> = {
      'GP': 'Gauteng',
      'WC': 'Western Cape',
      'KZN': 'KwaZulu-Natal',
      'EC': 'Eastern Cape',
      'FS': 'Free State',
      'LP': 'Limpopo',
      'MP': 'Mpumalanga',
      'NC': 'Northern Cape',
      'NW': 'North West'
    };
    return provinceCodes[code?.toUpperCase()] || code || 'Unknown';
  };

  // Helper function to extract province from license number
  const extractProvinceFromLicense = (license: string): string => {
    const provincePatterns = [
      { pattern: /GP$/, province: 'Gauteng' },
      { pattern: /WC$/, province: 'Western Cape' },
      { pattern: /KZN$/, province: 'KwaZulu-Natal' },
      { pattern: /EC$/, province: 'Eastern Cape' },
      { pattern: /FS$/, province: 'Free State' },
      { pattern: /LP$/, province: 'Limpopo' },
      { pattern: /MP$/, province: 'Mpumalanga' },
      { pattern: /NC$/, province: 'Northern Cape' },
      { pattern: /NW$/, province: 'North West' }
    ];
    
    for (const { pattern, province } of provincePatterns) {
      if (pattern.test(license)) {
        return province;
      }
    }
    return '';
  };

  // Helper function to format SA dates
  const formatSADate = (dateStr: string): string => {
    try {
      if (!dateStr) return 'Unknown';
      
      // Handle different date formats
      if (dateStr.match(/^\d{4}-\d{2}$/)) {
        return dateStr; // Already in YYYY-MM format
      }
      
      if (dateStr.match(/^\d{2}\/\d{4}$/)) {
        const [month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}`;
      }
      
      if (dateStr.match(/^\d{4}[-\/]\d{2}[-\/]\d{2}$/)) {
        return dateStr.replace(/\//g, '-');
      }
      
      if (dateStr.match(/^\d{2}[-\/]\d{2}[-\/]\d{4}$/)) {
        const parts = dateStr.split(/[-\/]/);
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      
      return dateStr;
    } catch {
      return dateStr || 'Unknown';
    }
  };

  // Helper function to map vehicle types
  const mapVehicleType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'MV': 'Motor Vehicle',
      'MC': 'Motorcycle',
      'TR': 'Trailer',
      'BUS': 'Bus',
      'TRUCK': 'Truck',
      'TAXI': 'Taxi'
    };
    return typeMap[type?.toUpperCase()] || type || 'Motor Vehicle';
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
