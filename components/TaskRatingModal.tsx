import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

import type { Business, Employee, Task } from './utility/types';
interface TaskRatingModalProps {
  visible: boolean;
  onClose: () => void;
  task: Task;
  employee: Employee;
  business: Business;
  onRatingSubmitted: () => void;
}

export default function TaskRatingModal({ 
  visible, 
  onClose, 
  task, 
  employee, 
  business, 
  onRatingSubmitted 
}: TaskRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  // Add state for rating period
  const [period, setPeriod] = useState<'task' | 'day' | 'week' | 'month'>('task');

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }

    setLoading(true);
    try {
      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Submit rating
      const { error } = await supabase
        .from('task_ratings')
        .insert({
          task_id: period === 'task' ? task.id : null,
          employee_id: employee.id,
          admin_id: user.id,
          rating: rating,
          feedback: feedback.trim() || null,
          business_id: business.id,
          period_type: period, // new field
          period_date: period === 'task' ? (task.completed_at || null) : new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Success', `Rating for ${period === 'task' ? 'task' : period} submitted successfully!`);
      onRatingSubmitted();
      onClose();
      setRating(0);
      setFeedback('');
      setPeriod('task');
    } catch (error: any) {
      console.error('Rating submission error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <FontAwesome5
              name={rating >= star ? 'star' : 'star-o'}
              size={32}
              color={rating >= star ? '#FFD700' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Rate Completed Task</Text>
          
          <View style={styles.taskInfo}>
            <Text style={styles.taskName}>{task?.name}</Text>
            <Text style={styles.employeeName}>Completed by: {employee?.name}</Text>
            <Text style={styles.completionDate}>
              Completed: {task?.completed_at ? new Date(task.completed_at).toLocaleDateString() : 'N/A'}
            </Text>
          </View>

          {/* Add period selector UI above rating section */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
            {['task', 'day', 'week', 'month'].map(p => (
              <TouchableOpacity
                key={p}
                style={{
                  backgroundColor: period === p ? '#1976d2' : '#e3f2fd',
                  borderRadius: 8,
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  marginHorizontal: 4,
                }}
                onPress={() => setPeriod(p as any)}
                disabled={loading}
              >
                <Text style={{ color: period === p ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 15 }}>
                  {p === 'task' ? 'Task' : p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.ratingLabel}>Rate this task (1-5 stars):</Text>
            {renderStars()}
            <Text style={styles.ratingText}>
              {rating === 0 ? 'Select a rating' : 
               rating === 1 ? 'Poor' :
               rating === 2 ? 'Fair' :
               rating === 3 ? 'Good' :
               rating === 4 ? 'Very Good' : 'Excellent'}
            </Text>
          </View>

          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Feedback (optional):</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Add feedback about the task completion..."
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.submitButton, rating === 0 && styles.disabledButton]}
              onPress={handleRatingSubmit}
              disabled={loading || rating === 0}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'Submit Rating'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 20,
  },
  taskInfo: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  taskName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  completionDate: {
    fontSize: 14,
    color: '#666',
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#1976d2',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
}); 