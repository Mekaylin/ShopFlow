import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, type TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { buttonStyles } from '@/constants/ModernStyles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [buttonStyles.base];
    
    // Add variant styles
    switch (variant) {
      case 'primary':
        baseStyle.push(buttonStyles.primary);
        break;
      case 'secondary':
        baseStyle.push(buttonStyles.secondary);
        break;
      case 'ghost':
        baseStyle.push(buttonStyles.ghost);
        break;
      case 'destructive':
        baseStyle.push(buttonStyles.destructive);
        break;
    }
    
    // Add size modifications
    if (size === 'sm') {
      baseStyle.push({ paddingHorizontal: 16, height: 36 });
    } else if (size === 'lg') {
      baseStyle.push({ paddingHorizontal: 32, height: 52 });
    }
    
    // Add disabled styles
    if (isDisabled) {
      baseStyle.push({ opacity: 0.5 });
    }
    
    return baseStyle;
  };
  
  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return buttonStyles.primaryText;
      case 'secondary':
        return buttonStyles.secondaryText;
      case 'ghost':
        return buttonStyles.ghostText;
      case 'destructive':
        return buttonStyles.destructiveText;
      default:
        return buttonStyles.primaryText;
    }
  };
  
  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : Colors.light.primary} 
        />
      ) : (
        <Text style={getTextStyle()}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
