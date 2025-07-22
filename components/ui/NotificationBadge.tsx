import React from 'react';
import { View, Text, StyleProp, ViewStyle } from 'react-native';
import { adminStyles } from '../utility/styles';

interface NotificationBadgeProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * NotificationBadge - shows a red dot or unread count for notifications.
 * Usage:
 * <NotificationBadge count={unreadCount} />
 * Place inside tab icon, header, or anywhere you want a badge.
 */
export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, style }) => {
  if (!count || count < 1) return null;
  return (
    <View style={[adminStyles.notificationBadge, style]}>
      <Text style={adminStyles.notificationBadgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};
