const IS_DEV = process.env.APP_VARIANT === 'development';

// app.config.js
export default {
  expo: {
    name: IS_DEV ? "InterZone (Dev)" : "InterZone",
    slug: "InterZone",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
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
        NSLocationAlwaysAndWhenInUseUsageDescription: "InterZone uses your location to recommend nearby activities and notify you about local events, even when the app is not open. For example, you might get alerts about a concert or food truck gathering near you.",
        NSLocationWhenInUseUsageDescription: "InterZone uses your location to show community posts, events, and activities near you. For example, you’ll see local meetups and concerts happening in your city.",
        ITSAppUsesNonExemptEncryption: false,
        EXUpdatesRuntimeVersion: "1.0.0",
        EXUpdatesURL: "https://u.expo.dev/02152cf1-073f-43da-8d04-f06d2948bde6"
      },
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist"
    },
    android: {
      package: IS_DEV ? "com.zhd.interzone" : "com.zhd.interzone",
      versionCode: 22,
      jsEngine: "hermes",
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE", 
        "android.permission.WRITE_EXTERNAL_STORAGE",
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
          }
        }
      ],
      "@react-native-google-signin/google-signin",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
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
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: false
        }
      ],
      [
        "expo-asset",
        {
          "assets": ["./assets"]
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
      runtimeVersion: "1.0.0"
    }
  }
};
