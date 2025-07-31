// Example integration: Add this button to your Employee or Admin Dashboard
// to navigate to the License Disk Scanner

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ScanLicenseDiskButtonProps {
  style?: any;
}

const ScanLicenseDiskButton: React.FC<ScanLicenseDiskButtonProps> = ({ style }) => {
  const router = useRouter();

  const handlePress = () => {
    router.push('/license-scanner');
  };

  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={handlePress}
    >
      <FontAwesome5 name="camera" size={16} color="#fff" />
      <Text style={styles.buttonText}>Scan License Disk</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ScanLicenseDiskButton;
