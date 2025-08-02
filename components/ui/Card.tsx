import { cardStyles } from '@/constants/ModernStyles';
import React from 'react';
import { View, type ViewProps } from 'react-native';

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardProps extends ViewProps {
  variant?: CardVariant;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  children,
  style,
  ...props
}: CardProps) {
  const getCardStyle = () => {
    switch (variant) {
      case 'elevated':
        return cardStyles.elevated;
      case 'outlined':
        return cardStyles.outlined;
      default:
        return cardStyles.base;
    }
  };

  return (
    <View style={[getCardStyle(), style]} {...props}>
      {children}
    </View>
  );
}
