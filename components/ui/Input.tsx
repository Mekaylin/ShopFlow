import React, { useState } from 'react';
import { View, TextInput, Text, type TextInputProps, ViewStyle, TextStyle } from 'react-native';
import { inputStyles } from '@/constants/ModernStyles';
import { Colors } from '@/constants/Colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getInputStyle = (): TextStyle[] => {
    const styles: TextStyle[] = [inputStyles.input];
    
    if (isFocused) {
      styles.push(inputStyles.inputFocused);
    }
    
    if (error) {
      styles.push(inputStyles.inputError);
    }
    
    return styles;
  };

  return (
    <View style={inputStyles.container}>
      {label && (
        <Text style={inputStyles.label}>{label}</Text>
      )}
      
      <TextInput
        style={[...getInputStyle(), style]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={Colors.light.textMuted}
        {...props}
      />
      
      {error && (
        <Text style={inputStyles.errorText}>{error}</Text>
      )}
      
      {helperText && !error && (
        <Text style={[inputStyles.errorText, { color: Colors.light.textMuted }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
}
