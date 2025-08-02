import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Task } from '../utility/types';
import { Colors } from '../../constants/Colors';

interface TaskRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  task: Task | null;
  darkMode?: boolean;
}

const TaskRatingModal: React.FC<TaskRatingModalProps> = ({ visible, onClose, onSubmit, task, darkMode = false }) => {
  const [rating, setRating] = useState(0);
  
  // Theme colors based on darkMode
  const themeColors = darkMode ? Colors.dark : Colors.light;

  React.useEffect(() => {
    setRating(0);
  }, [visible, task]);

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
        <View style={[styles.content, { backgroundColor: themeColors.surface }]}>
          <Text style={[styles.title, { color: themeColors.primary }]}>Rate Task</Text>
          <Text style={[styles.taskName, { color: themeColors.text }]}>{task.name}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <FontAwesome
                  name={rating >= star ? 'star' : 'star-o'}
                  size={32}
                  color={rating >= star ? themeColors.warning : themeColors.textMuted}
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.submitBtn, 
              { backgroundColor: themeColors.primary },
              rating === 0 && { backgroundColor: themeColors.textMuted }
            ]}
            onPress={() => {
              if (rating > 0) onSubmit(rating);
            }}
            disabled={rating === 0}
          >
            <Text style={[styles.submitBtnText, { color: themeColors.primaryForeground }]}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: themeColors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { borderRadius: 12, padding: 24, width: 320, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  taskName: { fontSize: 16, marginBottom: 16 },
  starsRow: { flexDirection: 'row', marginBottom: 20 },
  submitBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 32, marginBottom: 10 },
  submitBtnText: { fontWeight: 'bold', fontSize: 16 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 15 },
});

export default TaskRatingModal;
