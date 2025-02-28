// app.config.js
export default {
  expo: {
    name: "InterZone",
    slug: "InterZone",
    version: "1.0.9",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      "imageWidth": 200
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.zhd.interzone",
      jsEngine: "hermes"
    },
    android: {
      package: "com.zhd.interzone",
      versionCode: 9,
      // adaptiveIcon: {
      //   foregroundImage: "./assets/images/icon.png",
        // backgroundColor: "#ffffff"
      // },
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
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './android/app/google-services.json',
      runtimeVersion: {
        policy: "appVersion"
      }
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-localization",
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
          isIosBackgroundLocationEnabled: true
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "02152cf1-073f-43da-8d04-f06d2948bde6"
      }
    },
    updates: {
      url: "https://u.expo.dev/02152cf1-073f-43da-8d04-f06d2948bde6"
    }
  }
};
