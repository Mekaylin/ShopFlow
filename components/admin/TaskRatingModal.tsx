import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import type { Task } from '../utility/types';

interface TaskRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  task: Task | null;
}

const TaskRatingModal: React.FC<TaskRatingModalProps> = ({ visible, onClose, onSubmit, task }) => {
  const [rating, setRating] = useState(0);

  React.useEffect(() => {
    setRating(0);
  }, [visible, task]);

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Rate Task</Text>
          <Text style={styles.taskName}>{task.name}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <FontAwesome
                  name={rating >= star ? 'star' : 'star-o'}
                  size={32}
                  color={rating >= star ? '#FFD700' : '#ccc'}
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, rating === 0 && styles.disabledBtn]}
            onPress={() => {
              if (rating > 0) onSubmit(rating);
            }}
            disabled={rating === 0}
          >
            <Text style={styles.submitBtnText}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  content: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#1976d2' },
  taskName: { fontSize: 16, marginBottom: 16, color: '#263238' },
  starsRow: { flexDirection: 'row', marginBottom: 20 },
  submitBtn: { backgroundColor: '#1976d2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32, marginBottom: 10 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { backgroundColor: '#b0bec5' },
  closeBtn: { padding: 8 },
  closeBtnText: { color: '#1976d2', fontSize: 15 },
});

export default TaskRatingModal;
