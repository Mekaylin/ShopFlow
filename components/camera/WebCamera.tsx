// components/camera/WebCamera.tsx
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WebCameraProps {
  onCodeScanned: (data: string) => void;
  isActive: boolean;
  style?: any;
  children?: React.ReactNode;
}

const WebCamera: React.FC<WebCameraProps> = ({ onCodeScanned, isActive, style, children }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera not supported in this browser');
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera if available
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
          setError('');
        }
      } catch (err: any) {
        console.error('Error accessing camera:', err);
        setError('Failed to access camera. Please check permissions.');
        setHasPermission(false);
      }
    };

    if (isActive) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);

  const performOCR = async (imageData: string): Promise<string> => {
    try {
      // For web implementation, we'll use a simulated OCR
      // In production, integrate with Tesseract.js or Google Vision API
      
      console.log('🔍 Performing OCR on image...');
      
      // Simulate OCR processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, return sample SA license data
      // In production, this would be actual OCR results
      const sampleLicenseData = [
        'GP|ABC123GP|2024-12|MOTOR VEHICLE|JOHN DOE|7901010001088',
        'WC|XYZ456WC|2025-06|MOTORCYCLE|JANE SMITH|8502020002099',
        'KZN|DEF789KZN|2024-11|TRUCK|MIKE JONES|7703030003000'
      ];
      
      const randomSample = sampleLicenseData[Math.floor(Math.random() * sampleLicenseData.length)];
      console.log('✅ OCR Result:', randomSample);
      
      return randomSample;
    } catch (error) {
      console.error('❌ OCR Error:', error);
      throw new Error('Failed to process image');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imageData = e.target?.result as string;
          
          // Perform OCR on the uploaded image
          const ocrResult = await performOCR(imageData);
          
          if (ocrResult) {
            onCodeScanned(ocrResult);
          } else {
            Alert.alert('Scan Failed', 'Could not read license disk from image. Please try a clearer photo.');
          }
        } catch (error) {
          console.error('File processing error:', error);
          Alert.alert('Processing Error', 'Failed to process the uploaded image.');
        } finally {
          setProcessing(false);
        }
      };
      
      reader.onerror = () => {
        setProcessing(false);
        Alert.alert('File Error', 'Failed to read the selected file.');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setProcessing(false);
      Alert.alert('Upload Error', 'Failed to upload the file.');
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Canvas context not available');
      
      // Set canvas size to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0);
      
      // Get image data
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Perform OCR
      const ocrResult = await performOCR(imageData);
      
      if (ocrResult) {
        onCodeScanned(ocrResult);
      } else {
        Alert.alert('Scan Failed', 'Could not read license disk. Please try again.');
      }
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Capture Error', 'Failed to capture photo.');
    } finally {
      setProcessing(false);
    }
  };

  if (error || !hasPermission) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <FontAwesome5 name="camera" size={48} color="#666" style={styles.errorIcon} />
          <Text style={styles.errorText}>
            {error || 'Camera access required'}
          </Text>
          
          {/* Enhanced Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.uploadTitle}>📸 Upload License Disk Image</Text>
            
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => fileInputRef.current?.click()}
              disabled={processing}
            >
              <FontAwesome5 
                name={processing ? "spinner" : "upload"} 
                size={20} 
                color="white" 
                style={processing ? { transform: [{ rotate: '45deg' }] } : {}}
              />
              <Text style={styles.uploadButtonText}>
                {processing ? 'Processing...' : 'Select Image'}
              </Text>
            </TouchableOpacity>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={styles.hiddenFileInput}
            />
            
            <Text style={styles.uploadHelpText}>
              📋 Supported formats: JPG, PNG, PDF417 barcodes
            </Text>
            <Text style={styles.uploadHelpText}>
              🎯 For best results: Good lighting, clear focus, minimal glare
            </Text>
          </View>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
        onLoadedMetadata={() => setIsScanning(true)}
      />
      <canvas ref={canvasRef} style={styles.hiddenCanvas} />
      
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          📱 Position license disk within the frame
        </Text>
        
        <View style={styles.scanArea}>
          <Text style={styles.scanAreaText}>License Disk Area</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.captureButton, processing && styles.disabledButton]}
              onPress={capturePhoto}
              disabled={processing}
            >
              <FontAwesome5 
                name={processing ? "spinner" : "camera"} 
                size={24} 
                color="white" 
              />
              <Text style={styles.buttonText}>
                {processing ? 'Processing...' : 'Capture & Scan'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.uploadButton, { marginLeft: 10 }]}
              onPress={() => fileInputRef.current?.click()}
              disabled={processing}
            >
              <FontAwesome5 name="upload" size={20} color="white" />
              <Text style={styles.buttonText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={styles.hiddenFileInput}
        />
      </View>
      
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    marginBottom: 20,
  },
  uploadSection: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  uploadButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 25,
    flex: 1,
    maxWidth: 160,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  hiddenFileInput: {
    display: 'none',
  } as any,
  uploadHelpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  hiddenCanvas: {
    display: 'none',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    backgroundColor: '#1976d2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 25,
    flex: 1,
    maxWidth: 180,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  scanArea: {
    width: 300,
    height: 180,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    marginVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaText: {
    color: '#00FF00',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 3,
  },
  overlayText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  message: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  helpText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 5,
    borderRadius: 3,
  },
  fileInput: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  } as any, // Web-specific styles
});

export default WebCamera;
