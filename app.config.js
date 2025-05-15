const IS_DEV = process.env.APP_VARIANT === 'development';

// app.config.js
export default {
  expo: {
    name: IS_DEV ? "InterZone (Dev)" : "InterZone",
    slug: "InterZone",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "interzone",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash_icon.png",
      resizeMode: "contain",
      "imageWidth": 200
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      // requireFullScreen: true,
      sdkVersion: "51.0",
      deploymentTarget: "18.0",
      buildNumber: "1.0.16",
      bundleIdentifier: IS_DEV ? "com.interzone.app" : "com.interzone.app",
      entitlements: {
        "com.apple.developer.applesignin": ["Default"],
      },
      runtimeVersion: "sdkVersion",
      usesAppleSignIn: true,
      jsEngine: "hermes",
      infoPlist: {
        LSApplicationQueriesSchemes: ['itms-apps'],
        // NSLocationAlwaysAndWhenInUseUsageDescription: "InterZone uses your location to recommend nearby activities and notify you about local events while you are using the app. For example, you might get alerts about a concert or food truck gathering near you.",        
        NSLocationWhenInUseUsageDescription: "InterZone uses your location to show nearby posts, events, and updates in your city. This helps you discover what's happening around you and connect with your community.",
        NSMicrophoneUsageDescription: "InterZone uses your microphone to record audio while capturing videos for your posts.",
        NSPhotoLibraryAddUsageDescription: "InterZone saves your photos and videos to your library so you can keep a copy of your shared content.",
        NSCameraUsageDescription: "InterZone uses your camera to capture photos and videos for your posts, helping you share moments with your local community.",
        NSPhotoLibraryUsageDescription: "InterZone needs access to your photo library to allow you to upload and save media for your posts, including trimmed videos.",
        ITSAppUsesNonExemptEncryption: false,
        EXUpdatesRuntimeVersion: "1.0.0",
        EXDefaultScreenOrientationMask: 'UIInterfaceOrientationMaskAllButUpsideDown',
        EXUpdatesURL: "https://u.expo.dev/02152cf1-073f-43da-8d04-f06d2948bde6"
      },
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist"
    },
    android: {
      package: IS_DEV ? "com.zhd.interzone" : "com.zhd.interzone",
      versionCode: 22,
      jsEngine: "hermes",
      enableProguardInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.FOREGROUND_SERVICE",
      
        "android.permission.READ_EXTERNAL_STORAGE", 
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.SCHEDULE_EXACT_ALARM"
      ],
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      runtimeVersion: {
        policy: "appVersion"
      }
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
              useFrameworks: "static",
              deploymentTarget: "18.0",
              configFile: "./ios/Podfile.config.xcconfig"
          },
          android: {
            enableProguardInReleaseBuilds: true,
            extraProguardRules: "./proguard-rules.pro"
          }
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification_icon.png",
          "color": "#ffffff",
          "defaultChannel": "default",
          "sounds": ["./assets/notification_sound.wav"],
          "enableBackgroundRemoteNotifications": false
        }
      ],
      ["react-native-compressor"],
      "@react-native-google-signin/google-signin",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/crashlytics",
      "expo-localization",
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends.",
          cameraPermission: "$(PRODUCT_NAME) uses your camera to scan QR codes for business verification and account setup."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "$(PRODUCT_NAME) uses your location to recommend nearby events and send local updates.",
          locationWhenInUsePermission: "$(PRODUCT_NAME) uses your location to show you nearby posts, events, and activities in your city while using the app.",
          isAndroidBackgroundLocationEnabled: false,
          isIosBackgroundLocationEnabled: false
        }
      ],
      [
        "expo-av",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone so you can record and send voice messages in chat."
        }
      ],
      [
        "expo-asset",
        {
          "assets": ["./assets"]
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow $(PRODUCT_NAME) to access your photo library so you can upload images and videos to your posts.",
          savePhotosPermission: "Allow $(PRODUCT_NAME) to save your edited or captured media to your library.",
          isAccessMediaLocationEnabled: true
        }
      ],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText: "$(PRODUCT_NAME) needs access to your camera to capture photos and videos for verifying businesses and creating posts.",
          enableMicrophonePermission: false,
          enableCodeScanner: true
        }
      ],
    ],
    extra: {
      eas: {
        projectId: "02152cf1-073f-43da-8d04-f06d2948bde6"
      }
    },
    updates: {
      url: "https://u.expo.dev/02152cf1-073f-43da-8d04-f06d2948bde6",
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
      runtimeVersion: "1.0.0"
    }
  }
};
