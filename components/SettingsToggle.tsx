import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface SettingsToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon?: string;
  iconColor?: string;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({
  label,
  description,
  value,
  onValueChange,
  icon,
  iconColor = '#1976d2',
}) => {
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
        onPress={() => onValueChange(!value)}
      >
        <FontAwesome5
          name={value ? 'check-circle' : 'circle'}
          size={20}
          color={value ? '#4CAF50' : '#ccc'}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '500' }}>
            {label}
          </Text>
          {description && (
            <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {description}
            </Text>
          )}
        </View>
        {icon && (
          <FontAwesome5
            name={icon}
            size={16}
            color={iconColor}
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default SettingsToggle;
