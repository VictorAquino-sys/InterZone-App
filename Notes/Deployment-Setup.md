1. For Production development, change app.json:
    -  "googleServicesFile": "${GOOGLE_SERVICES_JSON}"

    AND:
    - Change the development google-services.json to production file.
    
2. Run production build using EAS BUild:
    - npx eas build --platform android --profile production
3. For development: 
    - Change the Firebase Configuration variables with the "EXPO_PUBLIC_" prefixes:
        // For development
        apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID

  * For production: 
    - Change the current "development" google-services.json file with "production" file. 
    - change the Firebase Configuration variables with the "EXPO_PUBLIC_" prefixes:
        // For production
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID

4.  remove "googleServicesFile" from app.json:
    "permissions": [
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      "googleServicesFile": "./android/app/google-services.json",
      "runtimeVersion": {
        "policy": "appVersion"
      }

5. add the following to "production" in eas.json:
    "env": {
        "GOOGLE_SERVICES_FILE": "@GOOGLE_SERVICES_JSON",
        "FIREBASE_API_KEY": "@FIREBASE_API_KEY",
        "FIREBASE_APP_ID": "@FIREBASE_APP_ID",
        "FIREBASE_AUTH_DOMAIN": "@FIREBASE_AUTH_DOMAIN",
        "FIREBASE_MEASUREMENT_ID": "@FIREBASE_MEASUREMENT_ID",
        "FIREBASE_MESSAGING_SENDER_ID": "@FIREBASE_MESSAGING_SENDER_ID",
        "FIREBASE_PROJECT_ID": "@FIREBASE_PROJECT_ID",
        "FIREBASE_STORAGE_BUCKET": "@FIREBASE_STORAGE_BUCKET",
        "GOOGLE_WEB_CLIENT_ID": "@GOOGLE_WEB_CLIENT_ID"
    }

6. To build an Android App Bundle(.aab file):
    npx eas build --platform android


7.  Branch             main
    Runtime version    1.0.3
    Platform           android
    Update group ID    3a3f75b8-040d-48c1-a0d8-8867e748039a
    Android update ID  cb9bea64-9f25-4c25-a36a-37bf8761f9fd