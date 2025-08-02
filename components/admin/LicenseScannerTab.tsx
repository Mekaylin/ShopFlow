import { FontAwesome5 } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import LicenseDiskScannerScreen from '../../app/screens/LicenseDiskScannerScreen';
import vehicleScanService from '../../services/vehicleScanService';
import type { ScanStatistics, User, VehicleScanWithUserInfo } from '../utility/types';

interface LicenseScannerTabProps {
  user: User;
  darkMode: boolean;
}

const LicenseScannerTab: React.FC<LicenseScannerTabProps> = ({ user, darkMode }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [vehicleRecords, setVehicleRecords] = useState<VehicleScanWithUserInfo[]>([]);
  const [statistics, setStatistics] = useState<ScanStatistics>({
    total_scans: 0,
    scans_today: 0,
    scans_this_week: 0,
    scans_this_month: 0,
    unique_scanners: 0,
    unique_vehicles: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [user.business_id]);

  const loadData = async () => {
    try {
      console.log('📊 Loading scan data for business:', user.business_id);
      setLoading(true);
      const [scansData, statsData] = await Promise.all([
        vehicleScanService.getScans(user.business_id, undefined, 50),
        vehicleScanService.getScanStatistics(user.business_id)
      ]);
      
      console.log('📈 Loaded scans:', scansData.length, 'records');
      console.log('📊 Loaded stats:', statsData);
      
      setVehicleRecords(scansData);
      setStatistics(statsData);
    } catch (error) {
      console.error('❌ Error loading scan data:', error);
      Alert.alert('Error', 'Failed to load scan data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [user.business_id]);

  const handleScanComplete = useCallback(async (vehicleData: any) => {
    try {
      console.log('🚗 Starting scan save process...', vehicleData);
      setLoading(true);
      
      // Check for duplicates first
      console.log('🔍 Checking for duplicates...');
      const duplicates = await vehicleScanService.checkDuplicateLicense(
        vehicleData.License,
        user.business_id
      );

      console.log('📊 Duplicate check result:', duplicates);

      if (duplicates.length > 0) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Duplicate License Found',
            `This license number (${vehicleData.License}) was already scanned on ${new Date(duplicates[0].scanned_at).toLocaleDateString()}. Do you want to scan it again?`,
            [
              { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Scan Anyway', onPress: () => resolve(true) }
            ]
          );
        });

        if (!proceed) {
          console.log('❌ User cancelled duplicate scan');
          setLoading(false);
          return;
        }
      }

      // Create the scan record
      console.log('💾 Creating scan record...');
      const scanData = {
        license_number: vehicleData.License,
        make: vehicleData.Make,
        model: vehicleData.Model,
        year: vehicleData.Year,
        vin: vehicleData.VIN,
        owner_name: vehicleData.Owner,
        owner_id_number: vehicleData.ID,
        scan_quality: 'good' as const
      };
      
      console.log('📤 Scan data to save:', scanData);
      
      const newScan = await vehicleScanService.createScan(scanData, user.business_id);
      
      console.log('✅ Scan saved successfully:', newScan);

      // Refresh data to show the new scan
      console.log('🔄 Refreshing data...');
      await loadData();
      setShowScanner(false);
      
      Alert.alert(
        'Vehicle Recorded',
        `License disk for ${vehicleData.License} has been successfully recorded.`,
        [{ text: 'OK' }]
      );
      
      console.log('🎉 Scan process completed successfully!');
    } catch (error) {
      console.error('💥 Error saving scan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to save scan: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [user.business_id, loadData]);

  // Handle image upload from main screen
  const handleImageUpload = useCallback(() => {
    if (typeof window !== 'undefined' && window.document) {
      // Web implementation
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
          console.log('📸 Processing uploaded image...');
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const imageData = e.target?.result as string;
              
              // Simulate OCR processing for uploaded image
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // For demo purposes, return sample SA license data
              const sampleLicenseData = [
                'GP|ABC123GP|2024-12|MOTOR VEHICLE|JOHN DOE|7901010001088',
                'WC|XYZ456WC|2025-06|MOTORCYCLE|JANE SMITH|8502020002099',
                'KZN|DEF789KZN|2024-11|TRUCK|MIKE JONES|7703030003000'
              ];
              
              const randomSample = sampleLicenseData[Math.floor(Math.random() * sampleLicenseData.length)];
              console.log('✅ OCR Result from upload:', randomSample);
              
              // Process the scan result using the existing handleScanComplete function
              await handleScanComplete({
                License: randomSample.split('|')[1] || 'UNKNOWN',
                Province: randomSample.split('|')[0] || 'GP',
                ExpiryDate: randomSample.split('|')[2] || '2024-12',
                VehicleType: randomSample.split('|')[3] || 'MOTOR VEHICLE',
                OwnerName: randomSample.split('|')[4] || 'Unknown Owner',
                IDNumber: randomSample.split('|')[5] || '0000000000000'
              });
            } catch (error) {
              console.error('Image processing error:', error);
              Alert.alert('Processing Error', 'Failed to process the uploaded image.');
            }
          };
          
          reader.onerror = () => {
            Alert.alert('File Error', 'Failed to read the selected file.');
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          Alert.alert('Upload Error', 'Failed to upload the file.');
        }
      };
      input.click();
    } else {
      // Mobile implementation would go here
      Alert.alert('Upload', 'Image upload is currently supported on web only.');
    }
  }, [handleScanComplete]);

  const handleVerifyRecord = useCallback(async (recordId: string) => {
    try {
      await vehicleScanService.verifyScan(recordId);
      await loadData(); // Refresh the list
      Alert.alert('Verified', 'Vehicle record has been verified.');
    } catch (error) {
      console.error('Error verifying scan:', error);
      Alert.alert('Error', 'Failed to verify record. Please try again.');
    }
  }, [loadData]);

  const handleDeleteRecord = useCallback(async (recordId: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this vehicle record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleScanService.deleteScan(recordId);
              await loadData(); // Refresh the list
              Alert.alert('Deleted', 'Vehicle record has been deleted.');
            } catch (error) {
              console.error('Error deleting scan:', error);
              Alert.alert('Error', 'Failed to delete record. Please try again.');
            }
          }
        }
      ]
    );
  }, [loadData]);

  const renderVehicleRecord = ({ item }: { item: VehicleScanWithUserInfo }) => (
    <View style={[styles.recordCard, { backgroundColor: darkMode ? '#23262f' : '#fff' }]}>
      <View style={styles.recordHeader}>
        <View style={styles.licenseContainer}>
          <FontAwesome5 name="car" size={16} color="#1976d2" />
          <Text style={[styles.licenseText, { color: darkMode ? '#fff' : '#1976d2' }]}>
            {item.license_number}
          </Text>
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <FontAwesome5 name="check-circle" size={14} color="#388e3c" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.recordActions}>
          {!item.verified && user.role === 'admin' && (
            <TouchableOpacity
              onPress={() => handleVerifyRecord(item.id)}
              style={styles.verifyButton}
            >
              <FontAwesome5 name="check" size={14} color="#388e3c" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => handleDeleteRecord(item.id)}
            style={styles.deleteButton}
          >
            <FontAwesome5 name="trash" size={14} color="#c62828" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.recordContent}>
        <View style={styles.recordRow}>
          <Text style={[styles.recordLabel, { color: darkMode ? '#b3c0e0' : '#666' }]}>Vehicle:</Text>
          <Text style={[styles.recordValue, { color: darkMode ? '#fff' : '#333' }]}>
            {item.year} {item.make} {item.model}
          </Text>
        </View>
        
        <View style={styles.recordRow}>
          <Text style={[styles.recordLabel, { color: darkMode ? '#b3c0e0' : '#666' }]}>Owner:</Text>
          <Text style={[styles.recordValue, { color: darkMode ? '#fff' : '#333' }]}>
            {item.owner_name}
          </Text>
        </View>
        
        <View style={styles.recordRow}>
          <Text style={[styles.recordLabel, { color: darkMode ? '#b3c0e0' : '#666' }]}>VIN:</Text>
          <Text style={[styles.recordValue, { color: darkMode ? '#fff' : '#333' }]}>
            {item.vin}
          </Text>
        </View>
        
        <View style={styles.recordRow}>
          <Text style={[styles.recordLabel, { color: darkMode ? '#b3c0e0' : '#666' }]}>Scanned:</Text>
          <Text style={[styles.recordValue, { color: darkMode ? '#fff' : '#333' }]}>
            {new Date(item.scanned_at).toLocaleDateString()} by {item.scanned_by_email}
          </Text>
        </View>
      </View>
    </View>
  );

  const theme = {
    background: darkMode ? '#181a20' : '#f5faff',
    card: darkMode ? '#23262f' : '#fff',
    text: darkMode ? '#fff' : '#333',
    subtext: darkMode ? '#b3c0e0' : '#666',
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <FontAwesome5 name="camera" size={24} color="#1976d2" />
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>License Disk Scanner</Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Scan and manage vehicle license disks
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleImageUpload}
          >
            <FontAwesome5 name="upload" size={16} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowScanner(true)}
          >
            <FontAwesome5 name="camera" size={16} color="#fff" />
            <Text style={styles.scanButtonText}>Scan License</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: '#1976d2' }]}>{statistics.total_scans}</Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Total Scanned</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: '#388e3c' }]}>
            {statistics.scans_today}
          </Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Today</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: '#f57c00' }]}>
            {statistics.unique_scanners}
          </Text>
          <Text style={[styles.statLabel, { color: theme.subtext }]}>Scanners</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.listTitle, { color: theme.text }]}>Recent Scans</Text>
        <Text style={[styles.listSubtitle, { color: theme.subtext }]}>
          {vehicleRecords.length} records
        </Text>
      </View>

      <FlatList
        data={vehicleRecords}
        keyExtractor={item => item.id}
        renderItem={renderVehicleRecord}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976d2']}
            tintColor={darkMode ? '#b3c0e0' : '#1976d2'}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#1976d2" style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Loading scans...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="camera" size={48} color={theme.subtext} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No scans yet</Text>
              <Text style={[styles.emptySubtitle, { color: theme.subtext }]}>
                Tap "Scan License" to start scanning vehicle license disks
              </Text>
            </View>
          )
        }
      />

      {/* Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowScanner(false)}
      >
        <LicenseDiskScannerScreen 
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listSubtitle: {
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  recordCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  licenseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  licenseText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 142, 60, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: '#388e3c',
    fontWeight: '500',
    marginLeft: 4,
  },
  recordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 142, 60, 0.1)',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
  },
  recordContent: {
    gap: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80,
  },
  recordValue: {
    fontSize: 14,
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 250,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButton: {
    backgroundColor: '#f57c00',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default LicenseScannerTab;
