import React, { useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { adminStyles } from '../utility/styles';
import { getBusinessCode } from '../utility/utils';

import type { User } from '../utility/types';
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
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
  onSwitchDashboard: () => void; // NEW PROP
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
  onSwitchDashboard,
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
      if (!user || !user.business_id) {
        setBusinessCode(null);
        Alert.alert('Error', 'No business ID found for this user.');
        setBusinessCodeLoading(false);
        return;
      }
      const code = await getBusinessCode(user.business_id);
      if (!code) {
        setBusinessCode(null);
        Alert.alert('Error', `No business code found for business_id: ${user.business_id}. Please contact support.`);
      } else {
        setBusinessCode(code);
      }
    } catch (error) {
      console.error('Error getting business code:', error, 'user:', user);
      setBusinessCode(null);
      let errorMsg = 'Unknown error';
      if (typeof error === 'string') {
        errorMsg = error;
      } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        errorMsg = (error as any).message;
      } else if (error) {
        errorMsg = JSON.stringify(error);
      }
      Alert.alert('Error', `Failed to get business code. ${errorMsg}`);
    } finally {
      setBusinessCodeLoading(false);
    }
  };

  // Remove generate business code logic. Business code is only set at signup.

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
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 10, width: '98%', marginHorizontal: 2, minWidth: 0, maxWidth: '100%', maxHeight: '92%' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2', marginBottom: 10 }}>Settings</Text>
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
                    accessibilityLabel="SettingsModal Name"
                    testID="settingsmodal-name-input"
                    style={[adminStyles.inputText, { marginBottom: 0 }]}
                    value={newLateThreshold}
                    onChangeText={setNewLateThreshold}
                    keyboardType="numeric"
                    placeholder="15"
                  />
                  <TouchableOpacity style={adminStyles.addBtn} onPress={handleSaveLateThreshold}>
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
                  accessibilityLabel="SettingsModal Email"
                  testID="settingsmodal-email-input"
                  style={adminStyles.inputText}
                  value={newWorkStart}
                  onChangeText={setNewWorkStart}
                  placeholder="08:00"
                />
                <Text style={adminStyles.timeLabel}>End:</Text>
                <TextInput
                  accessibilityLabel="SettingsModal Old Password"
                  testID="settingsmodal-old-password-input"
                  style={adminStyles.inputText}
                  value={newWorkEnd}
                  onChangeText={setNewWorkEnd}
                  placeholder="17:00"
                />
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={adminStyles.timeLabel}>Lunch Start:</Text>
                <TextInput
                  accessibilityLabel="SettingsModal New Password"
                  testID="settingsmodal-new-password-input"
                  style={adminStyles.inputText}
                  value={newLunchStart}
                  onChangeText={setNewLunchStart}
                  placeholder="12:00"
                />
                <Text style={adminStyles.timeLabel}>Lunch End:</Text>
                <TextInput
                  accessibilityLabel="SettingsModal Confirm Password"
                  testID="settingsmodal-confirm-password-input"
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
                  <TouchableOpacity
                    style={[adminStyles.addBtn, { opacity: businessCodeLoading ? 0.6 : 1 }]} 
                    onPress={handleGetBusinessCode}
                    disabled={businessCodeLoading}
                  >
                    <Text style={adminStyles.addBtnText}>
                      {businessCodeLoading ? 'Loading...' : 'Get Code'}
                    </Text>
                  </TouchableOpacity>
                  {/* No generate new code button. Code is set at business signup. */}
                </View>
                
                {businessCode && (
                  <View style={{ backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4, textAlign: 'center' }}>Business Code:</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2', textAlign: 'center', marginBottom: 12 }}>{businessCode}</Text>
                    <TouchableOpacity style={[adminStyles.addBtn, { width: 180, alignSelf: 'center' }]} onPress={handleCopyBusinessCode}>
                      <Text style={adminStyles.addBtnText}>
                        {showCodeCopied ? 'Copied!' : 'Copy Code'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Dashboard Switch Section */}
            <View style={{ marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
              <TouchableOpacity style={[adminStyles.logoutBtn, { width: 180, marginBottom: 14 }]} onPress={onLogout}>
                <Text style={adminStyles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[adminStyles.addBtn, { width: 180, marginBottom: 14 }]} onPress={onSwitchDashboard}>
                <Text style={adminStyles.addBtnText}>Switch to Employee Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[adminStyles.closeBtn, { width: 180 }]} onPress={onClose}>
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