(Daily logs of what have been worked on)

### 02-22
Upgrading InterZone App Expo SDK 50 from 49:
* Update to the latest version of EAS CLI:
`npm i -g eas-cli`
* Install the new version of the Expo package:
`npm install expo@^50.0.0`
* Upgrade all dependencies to match SDK 50:
`npx expo install --fix`
* Check for potential issues:
`npx expo-doctor@latest`


### 02-11
[x] Fetch user data from Firestore correctly.
[x] Ensure post author details are stored properly.
[x] User `users` collection instead of `user`.
Notes:
- The previous version only fetched the user's name from AsyncStorage, not from Firestore.
- Now, useFocusEffect retrieves user details from Firestore's "users" collection.


### 02-10
[x] Integrated Firebase Authentication (login, logout, registration)
[x] Firebase Auth API Key is working
[x] User authentication state changes are detected
[x] Logged-in user data is correctly retrieved
[x] Firestate is storing user data
[x] Debugged Expo environment variables issue (used `.env` instead of `app.json`)
