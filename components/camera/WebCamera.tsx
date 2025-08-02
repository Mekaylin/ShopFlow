// components/camera/WebCamera.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface WebCameraProps {
  onScanComplete: (result: any) => void;
  onClose: () => void;
}

interface OCRResult {
  text: string;
  confidence: number;
  licenseNumber?: string;
  expiryDate?: string;
  vehicleType?: string;
}

const WebCamera: React.FC<WebCameraProps> = ({ onScanComplete, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      initializeCamera();
    }

    return () => {
      cleanupCamera();
    };
  }, []);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const cleanupCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureFrame = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const performOCR = async (imageData: string): Promise<OCRResult> => {
    // Simulate OCR processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock OCR result for license disk
    const mockResults: OCRResult[] = [
      {
        text: "LICENSE DISK\nVehicle Registration\nLicense: ABC-123-GP\nExpiry: 2024-12-31\nVehicle Type: Motor Car",
        confidence: 0.92,
        licenseNumber: "ABC-123-GP",
        expiryDate: "2024-12-31",
        vehicleType: "Motor Car"
      },
      {
        text: "GAUTENG PROVINCE\nMotor Vehicle License\nReg: XYZ-789-GP\nValid Until: 2024-11-30\nType: Light Motor Vehicle",
        confidence: 0.88,
        licenseNumber: "XYZ-789-GP",
        expiryDate: "2024-11-30",
        vehicleType: "Light Motor Vehicle"
      }
    ];

    return mockResults[Math.floor(Math.random() * mockResults.length)];
  };

  const handleScan = async () => {
    if (isScanning) return;

    setIsScanning(true);

    try {
      const imageData = captureFrame();
      if (!imageData) {
        throw new Error('Failed to capture image');
      }

      const ocrResult = await performOCR(imageData);
      
      if (ocrResult.confidence > 0.8) {
        onScanComplete({
          success: true,
          data: ocrResult,
          imageData: imageData,
          timestamp: new Date().toISOString()
        });
      } else {
        Alert.alert(
          'Low Confidence',
          'The scan quality is low. Please try again with better lighting and positioning.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Failed',
        'Failed to scan the license disk. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>
          Camera scanning is only available on web platforms.
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.messageText}>Initializing camera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <FontAwesome5 name="camera-retro" size={64} color="#999" style={styles.icon} />
        <Text style={styles.messageText}>
          Camera access is needed to scan license disks. Please use the "Upload Image" button on the main screen to upload photos instead.
        </Text>
        
        <Text style={styles.uploadHelpText}>
          📋 Camera access required for license disk scanning
        </Text>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Scan License Disk</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <FontAwesome5 name="times" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        <video
          ref={videoRef}
          style={styles.video}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>
            Position the license disk within the frame
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <FontAwesome5 name="camera" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : 'Scan License Disk'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scanButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonDisabled: {
    backgroundColor: '#666666',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageText: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  uploadHelpText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  icon: {
    alignSelf: 'center',
    marginVertical: 20,
  },
});

export default WebCamera;
