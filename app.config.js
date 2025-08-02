export default ({ config }) => {
  const basePlugins = [
    "expo-router",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/splash-icon.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#1976d2"
      }
    ],
    "expo-secure-store",
    [
      "@sentry/react-native/expo",
      {
        "url": "https://sentry.io/",
        "project": "react-native",
        "organization": "shopflow-fm"
      }
    ]
  ];

  // Add vision camera plugin only for native platforms (not web)
  const isWeb = process.env.EXPO_PLATFORM === 'web';
  
  const plugins = isWeb ? basePlugins : [
    ...basePlugins,
    [
      "react-native-vision-camera",
      {
        "cameraPermissionText": "$(PRODUCT_NAME) needs access to your Camera to scan license disks.",
        "enableMicrophonePermission": false
      }
    ]
  ];

  return {
    ...config,
    expo: {
      ...config.expo,
      plugins
    }
  };
};
