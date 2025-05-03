const IS_DEV = process.env.APP_VARIANT === 'development';

// app.config.js
export default {
  expo: {
    name: IS_DEV ? "InterZone (Dev)" : "InterZone",
    slug: "InterZone",
    version: "1.0.0",
    orientation: "portrait",
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
      supportsTablet: false,
      sdkVersion: "19.0",
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
        NSLocationAlwaysAndWhenInUseUsageDescription: "InterZone uses your location to recommend nearby activities and notify you about local events while you are using the app. For example, you might get alerts about a concert or food truck gathering near you.",        
        NSLocationWhenInUseUsageDescription: "InterZone uses your location to show community posts, events, and activities near you. For example, you will see local meetups and concerts happening in your city.",
        NSMicrophoneUsageDescription: "We need access to your microphone to record videos.",
        NSPhotoLibraryAddUsageDescription: "Give InterZone permission to save photos",
        NSPhotoLibraryUsageDescription: "InterZone needs access to your photo library to upload and share media.",
        NSCameraUsageDescription: "InterZone needs access to your camera to record and upload videos or photos.",
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
          cameraPermission: "The app needs access to your camera to take pictures."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location at all times.",
          locationWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location.",
          isAndroidBackgroundLocationEnabled: false,
          isIosBackgroundLocationEnabled: false
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone."
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
          photosPermission: "Allow InterZone to access your photos.",
          savePhotosPermission: "Allow InterZone to save photos.",
          isAccessMediaLocationEnabled: true
        }
      ],
    ],
    updates: {
      url: "https://u.expo.dev/02152cf1-073f-43da-8d04-f06d2948bde6", //production URL
      fallbackToCacheTimeout: 0, // Launch as fast as possible
      checkAutomatically: "ON_LOAD", // Check for updates every time app starts
    },
    extra: {
      eas: {
        projectId: "02152cf1-073f-43da-8d04-f06d2948bde6"
      }
    },
    updates: {
      url: "https://u.expo.dev/02152cf1-073f-43da-8d04-f06d2948bde6",
      runtimeVersion: "1.0.0"
    }
  }
};
