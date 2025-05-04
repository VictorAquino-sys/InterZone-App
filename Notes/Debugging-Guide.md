(Fixes & Solutions for issues)

4-02
    Push to Github on iOS:
    git push origin ios-rollback-working

3-31
    For github, when divergent branches occurs, do the following:
    1.
    git add .
    git commit -am "some text"
    git pull --rebase
    
    Optional in case of conflits:
    git add <filename>
    git rebase --continue
    2.
    finally:
    git push
 
3-28
* Redeploy the function
    From your project root where your functions/ folder lives, run:
    bash
    cd functions
    npx firebase deploy --only functions

* to test the app in dev, run:
    android
    npx eas build --platform android --profile development
    
    to test on IOS
    npx eas build --platform ios --profile ios-simulator
    To test on android device:
    npx expo start --dev-client --host lan
    connect through:
    http://10.0.0.101:8081

* To prebuild folders run:
    for android/ios
    npx expo rebuild
    Android
    npx expo prebuild --clean

    IOS
    if app.config.js has been modified run:
    npx expo prebuild --platform ios

    if not:
    npx expo run:ios
    
    to open xcode project:
    open ios/InterZone.xcworkspace

    Configure for iOS
    Delete Podfile.lock and ios/Pods folder
    rm -rf ios/Pods ios/Podfile.lock
    Run npx pod-install after installing the npm package.
    npx pod-install

* For production:
    Android
    npx eas build --platform android --profile production
    IOS/Submit
    npx eas build --platform ios 
    (OR)
    eas build -p ios --profile production
    Then:
    npx eas submit --platform ios 

03-22
* Migrate to TypeScript. Run this command to check for type errors without necesssary outputting JavaScript files.
    Terminal
    npm run tsc

02-23
* For Local development modify the app.json to:
 "googleServicesFile": "./android/app/google-services.json"

02-22
* Run app using IPv4 Address
Terminal (for Windos use 'set')
- set export EXPO_PACKAGER_PROXY_URL=http://10.0.0.101:8081
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
