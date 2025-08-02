// components/camera/PlatformCamera.tsx
import React from 'react';
import { Platform } from 'react-native';

// Platform-specific camera imports
let VisionCamera: any = null;
let WebCamera: any = null;

if (Platform.OS !== 'web') {
  try {
    VisionCamera = require('./VisionCamera').default;
  } catch (error) {
    console.warn('Vision Camera not available:', error);
  }
} else {
  try {
    WebCamera = require('./WebCamera').default;
  } catch (error) {
    console.warn('Web Camera not available:', error);
  }
}

interface PlatformCameraProps {
  onCodeScanned: (data: string) => void;
  isActive: boolean;
  style?: any;
  children?: React.ReactNode;
}

const PlatformCamera: React.FC<PlatformCameraProps> = (props) => {
  if (Platform.OS === 'web') {
    return WebCamera ? <WebCamera {...props} /> : null;
  } else {
    return VisionCamera ? <VisionCamera {...props} /> : null;
  }
};

export default PlatformCamera;
