(Instruccions & API keys setup)
### Firebase Setup Guide
  **Setup Steps:**
1. Go to Firebase Console → Create a new project (`interzone-c62ed`)
2. Download `google-services.json` and place it in `android/app/`
3. Create `.env` and add:
   EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC... EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=interzone-c62ed.firebaseapp.com
   etc...
4. Restart Expo with `npx expo start --clear`

