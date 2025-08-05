import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface Material {
  id: string;
  name: string;
  unit: string;
}

interface MaterialUsed {
  materialId: string;
  quantity: number;
  materialTypeId?: string;
}

interface Task {
  id: string;
  name: string;
  start: string;
  deadline: string;
  completed: boolean;
  completedAt?: string;
  materialsUsed?: MaterialUsed[];
}

interface TaskModalProps {
  task: Task;
  materials: Material[];
  materialTypes: Record<string, any[]>;
  onClose: () => void;
  onMarkComplete?: (taskId: string) => void;
  showCompleteButton?: boolean;
  styles: any;
}

const TaskModal: React.FC<TaskModalProps> = ({
  task,
  materials,
  materialTypes,
  onClose,
  onMarkComplete,
  showCompleteButton = true,
  styles,
}) => {
  const handleMarkComplete = () => {
    if (onMarkComplete) {
      Alert.alert(
        'Mark Complete',
        `Mark "${task.name}" as completed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => onMarkComplete(task.id) }
        ]
      );
    }
  };

  return (
    <View>
      <Text style={styles.modalTitle}>{task.name}</Text>
      <Text style={styles.taskTime}>Start: {task.start} | Due: {task.deadline}</Text>
      <Text style={styles.taskStatus}>{task.completed ? 'Completed' : 'In Progress'}</Text>
      
      {task.completed && task.completedAt && (
        <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>
          Completed at: {new Date(task.completedAt).toLocaleString()}
        </Text>
      )}
      
      {!task.completed && showCompleteButton && onMarkComplete && (
        <View style={{ marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.completeBtn, { backgroundColor: '#4CAF50' }]}
            onPress={handleMarkComplete}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark Complete</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {task.completed && task.materialsUsed && task.materialsUsed.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Materials Used:</Text>
          {task.materialsUsed.map(mu => {
            const mat = materials.find(m => m.id === mu.materialId);
            if (!mat) return null;
            return (
              <Text key={mat.id} style={{ fontSize: 14 }}>
                {mat.name}: {mu.quantity} {mat.unit}
              </Text>
            );
          })}
        </View>
      )}
      
      <TouchableOpacity style={[styles.closeBtn, { marginTop: 16 }]} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

export default TaskModal;
