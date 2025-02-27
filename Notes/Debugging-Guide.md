(Fixes & Solutions for issues)

02-23
* For Local development modify the app.json to:
 "googleServicesFile": "./android/app/google-services.json"

02-22
* Run app using IPv4 Address
Terminal
- export EXPO_PACKAGER_PROXY_URL=http://10.0.0.101:8081
- npx expo start --clear
* If updating dependecies doesn't reflect the changes use:
 npm cache clean --force

 * To check Node.js version
 TERMINAL
 node -v

 * Clear Cache and Rebuild the App:
 npx react-native run-android


 * When dealing with deprecated nested dependencies:
 npm ls <name>

 * Sometimes, issues can stem from a corrupted 'node_modules' directory or 'package-lock.json'. It's a good idea to clean these and reinstall:
 TERMINAL
 rm -rf node_modules package-lock.json
 npm install
 npm update

* Identify Problematic Libraries
Run the app on a device/emulator and execute:
adb logcat -s AndroidRuntime

* to Update dependencies run:
npx expo install --fix


02-10 Firebase Auth/Invalid API Key Error
**Issue:** `FirebaseError: Firebase: Error (auth/invalid-api-key)`
**Cause:** Expo wasn't loading: `.env` variables correctly.
**Solution:**
1. Moved Firebase credentials from `app.json` to `.env`
2. Added `EXPO_PUBLIC_FIREBASE_*` variables
3. Restarted Expo with `npx expo start --clear`
