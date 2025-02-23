(Fixes & Solutions for issues)

02-10 Firebase Auth/Invalid API Key Error
**Issue:** `FirebaseError: Firebase: Error (auth/invalid-api-key)`
**Cause:** Expo wasn't loading: `.env` variables correctly.
**Solution:**
1. Moved Firebase credentials from `app.json` to `.env`
2. Added `EXPO_PUBLIC_FIREBASE_*` variables
3. Restarted Expo with `npx expo start --clear`
