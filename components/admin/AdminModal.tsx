import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface AdminModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  closeText?: string;
}

const AdminModal: React.FC<AdminModalProps> = ({ visible, onClose, title, children, style, closeText = 'Close' }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={[styles.content, style]}>
        <Text style={styles.title}>{title}</Text>
        {children}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>{closeText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
    textAlign: 'center',
  },
  closeBtn: {
    backgroundColor: '#c62828',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AdminModal; 