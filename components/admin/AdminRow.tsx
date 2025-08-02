import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { createShadowStyle, shadowPresets } from '../../utils/shadowUtils';

interface AdminRowProps {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const AdminRow: React.FC<AdminRowProps> = ({ icon, iconColor = '#1976d2', title, subtitle, actions, style, children }) => (
  <View style={[styles.row, style]}>
    {icon && (
      <FontAwesome5 name={icon} size={24} color={iconColor} style={styles.icon} />
    )}
    <View style={styles.content}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </View>
    {actions && <View style={styles.actions}>{actions}</View>}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    ...createShadowStyle(shadowPresets.small),
  },
  icon: {
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default AdminRow; 