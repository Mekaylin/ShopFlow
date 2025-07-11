import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { adminStyles } from '../utility/styles';
import { generateBusinessCode, getBusinessCode } from '../utility/utils';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  darkMode: boolean;
  biometricEnabled: boolean;
  biometricLoggedIn: boolean;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  lateThreshold: number;
  onLogout: () => void;
  onUpdateWorkHours: (hours: { start: string; end: string; lunchStart: string; lunchEnd: string }) => void;
  onUpdateLateThreshold: (threshold: number) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  user,
  darkMode,
  biometricEnabled,
  biometricLoggedIn,
  workStart,
  workEnd,
  lunchStart,
  lunchEnd,
  lateThreshold,
  onLogout,
  onUpdateWorkHours,
  onUpdateLateThreshold,
}) => {
  const [businessCode, setBusinessCode] = useState<string | null>(null);
  const [businessCodeLoading, setBusinessCodeLoading] = useState(false);
  const [showCodeCopied, setShowCodeCopied] = useState(false);
  const [newWorkStart, setNewWorkStart] = useState(workStart);
  const [newWorkEnd, setNewWorkEnd] = useState(workEnd);
  const [newLunchStart, setNewLunchStart] = useState(lunchStart);
  const [newLunchEnd, setNewLunchEnd] = useState(lunchEnd);
  const [newLateThreshold, setNewLateThreshold] = useState(lateThreshold.toString());

  // Business code management
  const handleGetBusinessCode = async () => {
    setBusinessCodeLoading(true);
    try {
      const code = await getBusinessCode(user.business_id);
      setBusinessCode(code);
    } catch (error) {
      console.error('Error getting business code:', error);
      Alert.alert('Error', 'Failed to get business code.');
    } finally {
      setBusinessCodeLoading(false);
    }
  };

  const handleGenerateBusinessCode = async () => {
    setBusinessCodeLoading(true);
    try {
      const code = await generateBusinessCode(user.business_id);
      setBusinessCode(code);
      Alert.alert('Success', 'New business code generated successfully.');
    } catch (error) {
      console.error('Error generating business code:', error);
      Alert.alert('Error', 'Failed to generate business code.');
    } finally {
      setBusinessCodeLoading(false);
    }
  };

  const handleCopyBusinessCode = async () => {
    if (!businessCode) return;
    try {
      await navigator.clipboard.writeText(businessCode);
      setShowCodeCopied(true);
      setTimeout(() => setShowCodeCopied(false), 1500);
    } catch {}
  };

  const handleSaveWorkHours = () => {
    onUpdateWorkHours({
      start: newWorkStart,
      end: newWorkEnd,
      lunchStart: newLunchStart,
      lunchEnd: newLunchEnd,
    });
    Alert.alert('Saved', 'Working hours and lunch times updated.');
  };

  const handleSaveLateThreshold = () => {
    const threshold = parseInt(newLateThreshold);
    if (isNaN(threshold) || threshold < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number for late threshold.');
      return;
    }
    onUpdateLateThreshold(threshold);
    Alert.alert('Saved', 'Late threshold updated.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%', maxHeight: '90%' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginBottom: 16 }}>Settings</Text>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Task Options */}
            <View style={adminStyles.settingsCard}>
              <Text style={adminStyles.settingsTitle}>Task Options</Text>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                  Late Threshold (minutes):
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TextInput
                    style={[adminStyles.inputText, { marginBottom: 0 }]}
                    value={newLateThreshold}
                    onChangeText={setNewLateThreshold}
                    keyboardType="numeric"
                    placeholder="15"
                  />
                  <TouchableOpacity style={[adminStyles.addBtn, { marginLeft: 8, paddingHorizontal: 12 }]} onPress={handleSaveLateThreshold}>
                    <Text style={adminStyles.addBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Working Hours */}
            <View style={adminStyles.settingsCard}>
              <Text style={adminStyles.settingsTitle}>Working Hours</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={adminStyles.timeLabel}>Start:</Text>
                <TextInput
                  style={adminStyles.inputText}
                  value={newWorkStart}
                  onChangeText={setNewWorkStart}
                  placeholder="08:00"
                />
                <Text style={adminStyles.timeLabel}>End:</Text>
                <TextInput
                  style={adminStyles.inputText}
                  value={newWorkEnd}
                  onChangeText={setNewWorkEnd}
                  placeholder="17:00"
                />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={adminStyles.timeLabel}>Lunch Start:</Text>
                <TextInput
                  style={adminStyles.inputText}
                  value={newLunchStart}
                  onChangeText={setNewLunchStart}
                  placeholder="12:00"
                />
                <Text style={adminStyles.timeLabel}>Lunch End:</Text>
                <TextInput
                  style={adminStyles.inputText}
                  value={newLunchEnd}
                  onChangeText={setNewLunchEnd}
                  placeholder="12:30"
                />
              </View>
              
              <TouchableOpacity style={adminStyles.addBtn} onPress={handleSaveWorkHours}>
                <Text style={adminStyles.addBtnText}>Save Hours</Text>
              </TouchableOpacity>
            </View>

            {/* Business Code Management (Admin Only) */}
            {user?.role === 'admin' && (
              <View style={adminStyles.settingsCard}>
                <Text style={adminStyles.settingsTitle}>Business Code</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <TouchableOpacity style={[adminStyles.addBtn, { flex: 1, marginRight: 8 }]} onPress={handleGetBusinessCode}>
                    <Text style={adminStyles.addBtnText}>
                      {businessCodeLoading ? 'Loading...' : 'Get Code'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[adminStyles.addBtn, { flex: 1, backgroundColor: '#4CAF50' }]} onPress={handleGenerateBusinessCode}>
                    <Text style={adminStyles.addBtnText}>Generate New</Text>
                  </TouchableOpacity>
                </View>
                
                {businessCode && (
                  <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Business Code:</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>{businessCode}</Text>
                    <TouchableOpacity style={[adminStyles.addBtn, { marginTop: 8 }]} onPress={handleCopyBusinessCode}>
                      <Text style={adminStyles.addBtnText}>
                        {showCodeCopied ? 'Copied!' : 'Copy Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Logout Section */}
            <View style={{ marginTop: 16 }}>
              <TouchableOpacity style={adminStyles.logoutBtn} onPress={onLogout}>
                <Text style={adminStyles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={adminStyles.closeBtn} onPress={onClose}>
                <Text style={adminStyles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default SettingsModal; 