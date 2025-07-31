import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { FontAwesome5 } from '@expo/vector-icons';

interface VehicleData {
  License: string;
  Make: string;
  VIN: string;
  Model: string;
  Year: string;
  Owner: string;
  ID: string;
}

interface LicenseDiskScannerScreenProps {
  onScanComplete?: (vehicleData: VehicleData) => void;
  onClose?: () => void;
}

const LicenseDiskScannerScreen: React.FC<LicenseDiskScannerScreenProps> = ({ 
  onScanComplete,
  onClose 
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [editableData, setEditableData] = useState<VehicleData | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Parse the scanned barcode string
  const parseVehicleData = (data: string): VehicleData | null => {
    try {
      // Split by pipe character and create key-value pairs
      const parts = data.split('|');
      const parsed: Partial<VehicleData> = {};

      parts.forEach(part => {
        const [key, value] = part.split(':');
        if (key && value) {
          switch (key.trim()) {
            case 'L':
              parsed.License = value.trim();
              break;
            case 'M':
              parsed.Make = value.trim();
              break;
            case 'V':
              parsed.VIN = value.trim();
              break;
            case 'C':
              parsed.Model = value.trim();
              break;
            case 'Y':
              parsed.Year = value.trim();
              break;
            case 'R':
              parsed.Owner = value.trim();
              break;
            case 'ID':
              parsed.ID = value.trim();
              break;
          }
        }
      });

      // Validate that we have the required fields
      if (parsed.License && parsed.Make && parsed.VIN && parsed.Model && parsed.Year && parsed.Owner && parsed.ID) {
        return parsed as VehicleData;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing vehicle data:', error);
      return null;
    }
  };

  const handleBarCodeScanned = ({ type, data }: BarCodeScannerResult) => {
    if (scanned) return;
    
    setScanned(true);
    console.log('📷 Barcode scanned!', { type, data });

    // Parse the vehicle data
    const parsedData = parseVehicleData(data);
    console.log('🔍 Parsed vehicle data:', parsedData);
    
    if (parsedData) {
      setEditableData(parsedData);
      setScanning(false);
      Alert.alert(
        'Scan Successful',
        'Vehicle license disk data has been scanned and parsed successfully!',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Invalid Barcode',
        'The scanned barcode does not contain valid South African vehicle license disk data. Please try again.',
        [
          {
            text: 'Scan Again',
            onPress: () => {
              setScanned(false);
            }
          }
        ]
      );
    }
  };

  const handleScanAgain = () => {
    setScanned(false);
    setScanning(true);
    setEditableData(null);
    setIsEditing(false);
  };

  const handleConfirm = () => {
    if (editableData) {
      if (onScanComplete) {
        console.log('✅ Calling onScanComplete with data:', editableData);
        onScanComplete(editableData);
      } else {
        Alert.alert(
          'Data Confirmed',
          'Vehicle data has been confirmed and can now be processed.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('Confirmed vehicle data:', editableData);
              }
            }
          ]
        );
      }
    }
  };

  const updateField = (field: keyof VehicleData, value: string) => {
    if (editableData) {
      setEditableData({
        ...editableData,
        [field]: value
      });
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <FontAwesome5 name="camera" size={64} color="#c62828" style={styles.icon} />
          <Text style={styles.errorText}>No access to camera</Text>
          <Text style={styles.errorSubtext}>
            Camera permission is required to scan vehicle license disks
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (scanning) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scan License Disk</Text>
          <Text style={styles.headerSubtitle}>
            Point your camera at the PDF417 barcode on the vehicle license disk
          </Text>
        </View>
        
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.scanner}
            barCodeTypes={[BarCodeScanner.Constants.BarCodeType.pdf417]}
          />
          
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanText}>
              Align the barcode within the frame
            </Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              // Navigate back or close scanner
              console.log('Cancel scanning');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show the parsed data form
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle Information</Text>
        <Text style={styles.headerSubtitle}>
          Review and confirm the scanned data
        </Text>
      </View>

      <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
        <View style={styles.dataCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="car" size={24} color="#1976d2" />
            <Text style={styles.cardTitle}>Scanned Vehicle Data</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <FontAwesome5 
                name={isEditing ? "check" : "edit"} 
                size={16} 
                color="#1976d2" 
              />
              <Text style={styles.editButtonText}>
                {isEditing ? "Done" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {editableData && (
            <View style={styles.fieldsContainer}>
              <DataField
                label="License Number"
                value={editableData.License}
                isEditing={isEditing}
                onChangeText={(value) => updateField('License', value)}
              />
              <DataField
                label="Make"
                value={editableData.Make}
                isEditing={isEditing}
                onChangeText={(value) => updateField('Make', value)}
              />
              <DataField
                label="Model"
                value={editableData.Model}
                isEditing={isEditing}
                onChangeText={(value) => updateField('Model', value)}
              />
              <DataField
                label="Year"
                value={editableData.Year}
                isEditing={isEditing}
                onChangeText={(value) => updateField('Year', value)}
                keyboardType="numeric"
              />
              <DataField
                label="VIN"
                value={editableData.VIN}
                isEditing={isEditing}
                onChangeText={(value) => updateField('VIN', value)}
              />
              <DataField
                label="Owner"
                value={editableData.Owner}
                isEditing={isEditing}
                onChangeText={(value) => updateField('Owner', value)}
              />
              <DataField
                label="ID Number"
                value={editableData.ID}
                isEditing={isEditing}
                onChangeText={(value) => updateField('ID', value)}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={handleScanAgain}
        >
          <FontAwesome5 name="camera" size={16} color="#666" />
          <Text style={styles.scanAgainButtonText}>Scan Again</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <FontAwesome5 name="check" size={16} color="#fff" />
          <Text style={styles.confirmButtonText}>Confirm Data</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Component for individual data fields
interface DataFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
}

const DataField: React.FC<DataFieldProps> = ({
  label,
  value,
  isEditing,
  onChangeText,
  keyboardType = 'default'
}) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="characters"
        />
      ) : (
        <Text style={styles.fieldValue}>{value}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1976d2',
  },
  icon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
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
    height: 120,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  dataCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginLeft: 12,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f0f8ff',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginLeft: 4,
  },
  fieldsContainer: {
    gap: 16,
  },
  fieldContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  fieldInput: {
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    justifyContent: 'center',
  },
  scanAgainButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 2,
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
});

export default LicenseDiskScannerScreen;
