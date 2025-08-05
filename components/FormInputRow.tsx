import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

interface FormInputRowProps {
  label?: string;
  inputs: Array<{
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
    secureTextEntry?: boolean;
    flex?: number;
  }>;
  style?: any;
  inputStyle?: any;
  showButton?: boolean;
  buttonText?: string;
  onButtonPress?: () => void;
  buttonStyle?: any;
}

const FormInputRow: React.FC<FormInputRowProps> = ({
  label,
  inputs,
  style,
  inputStyle,
  showButton = false,
  buttonText = 'Submit',
  onButtonPress,
  buttonStyle,
}) => {
  return (
    <View style={style}>
      {label && (
        <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8, color: '#333' }}>
          {label}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {inputs.map((input, index) => (
          <TextInput
            key={index}
            style={[
              {
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                backgroundColor: '#fff',
                marginRight: index < inputs.length - 1 || showButton ? 8 : 0,
                flex: input.flex || 1,
              },
              inputStyle,
            ]}
            placeholder={input.placeholder}
            value={input.value}
            onChangeText={input.onChangeText}
            keyboardType={input.keyboardType || 'default'}
            secureTextEntry={input.secureTextEntry || false}
          />
        ))}
        {showButton && onButtonPress && (
          <TouchableOpacity
            style={[
              {
                backgroundColor: '#1976d2',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
              },
              buttonStyle,
            ]}
            onPress={onButtonPress}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormInputRow;
