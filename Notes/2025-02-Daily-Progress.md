(Daily logs of what have been worked on)

### 2025-02-10 - Daily Progress
[x] Integrated Firebase Authentication (login, logout, registration)
[x] Firebase Auth API Key is working
[x] User authentication state changes are detected
[x] Logged-in user data is correctly retrieved
[x] Firestate is storing user data
[x] Debugged Expo environment variables issue (used `.env` instead of `app.json`)

### 02-11
[x] Fetch user data from Firestore correctly.
[x] Ensure post author details are stored properly.
[x] User `users` collection instead of `user`.
Notes:
- The previous version only fetched the user's name from AsyncStorage, not from Firestore.
- Now, useFocusEffect retrieves user details from Firestore's "users" collection.

