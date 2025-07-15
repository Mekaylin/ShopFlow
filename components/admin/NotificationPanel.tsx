import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface Notification {
  id: string;
  message: string;
  timestamp: string;
  type: 'late' | 'info';
}

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose }) => {
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#fff', zIndex: 999, padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <FontAwesome5 name="bell" size={20} color="#1976d2" style={{ marginRight: 8 }} />
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Notifications</Text>
        <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={onClose}>
          <FontAwesome5 name="times" size={18} color="#888" />
        </TouchableOpacity>
      </View>
      {notifications.length === 0 ? (
        <Text style={{ color: '#888' }}>No notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
              <Text style={{ color: item.type === 'late' ? '#c62828' : '#1976d2', fontWeight: 'bold' }}>{item.message}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default NotificationPanel;
