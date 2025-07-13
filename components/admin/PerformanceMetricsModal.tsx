import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PerformanceMetrics } from '../utility/types';

interface PerformanceMetricsModalProps {
  visible: boolean;
  onClose: () => void;
  metrics: PerformanceMetrics[];
}

const PerformanceMetricsModal: React.FC<PerformanceMetricsModalProps> = ({ visible, onClose, metrics }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Detailed Performance Metrics</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome5 name="times" size={20} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={metrics}
            keyExtractor={item => item.employee_id}
            renderItem={({ item }) => (
              <View style={styles.metricRow}>
                <Text style={styles.name}>{item.employee_name}</Text>
                <Text style={styles.stat}>Tasks: {item.completed_tasks}/{item.total_tasks}</Text>
                <Text style={styles.stat}>Avg Rating: {item.average_rating?.toFixed(2) ?? 'N/A'}</Text>
                <Text style={styles.stat}>Score: {item.performance_score?.toFixed(2) ?? 'N/A'}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No metrics found.</Text>}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  closeBtn: {
    padding: 4,
  },
  metricRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  name: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  stat: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
  },
});

export default PerformanceMetricsModal;
