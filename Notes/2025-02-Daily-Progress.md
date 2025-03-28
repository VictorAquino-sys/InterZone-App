(Daily logs of what have been worked on)

### 03-28
    - Integrated Babel Module Resolver:
        npm install --save-dev babel-plugin-module-resolver



### 03-27
    - Integrate Google Sign-In: added plugins.
    - Installing Expo Development Builds since needed libraries aren't available in Expo Go
        Terminal: 
        npx expo install expo-dev-client
        npm install -g eas-cli
        
### 03-22
    - updated firebase setup. 
    - Install expo-image
    - Install Expo Asset
    - added custom mapping

### 03-14
    - Set up the TTL Policy for Time-to-Live (usually 7 days to expired).
    - Fixed UI issues: scrollable categories, search bar border & width, profile pic alignment.
    - Updated image picker to maintain original image size, fixed UI scrolling for categories, and improved HomeScreen layout.
    - Allow Free Cropping.

### 03-13
    - add Like button feature in Home Screen
    - Implemented serach bar, row of categories, improved UI click layout, and added funny message on category click
    - added Spanish translations for search bar, categories, and fixed category filtering with translations
    
### 03-12
    Ran in terminal
    for windows and then must be done in Mac as well
    sudo npx expo prebuild

### 02-03
1. Allow users to click on profile pictures from posts and view them in full screen within React Native app. We use modal to approach this matter.
    Steps:
    - Install necessary Packages:
    npm install react-native-modal

    -Update The HomeScreen.js to use Modal
    commited to github as:
    "Add feature to view user profile pictures in full screen on HomeScreen"

2. Implement similar feature for viewing post images in full screen.

3. Prompt users to update app to the latest version.


### 02-25
1. Image upload and Display Enhancements:
    - Improved the image upload functionality in both `ProfileScreen` and `PostScreen` by ensuring that images are uploaded with the correct MIME types using the mime package.
    - Integrated images in posts displayed on the `HomeScreen`, ensuring that each post can optionally include an image that reflects alongside the text.
2. Firebase Rules and Error Handling:
    - Updated Firebase storage rules to secure images paths, ensuring users can only access their own images.
    - Implemented error handling for image uploads and deletions, addressing issues like unauthorized access and non-existing objects.
3. Post Deletion Functionality:
    - Enhanced the post deletion process to include the removal of associated images from Firebase Storage. This prevents orphaned images from accumulating in storage when their corresponding posts are deleted.
    - Resolved bugs related to image delition where thrown if the image file did not exist.
4. Debugging and Logging:
    - Fixed several bugs and enhanced error loggging for debbuging. Addrressed specific errors like 'getDownloadURL' not found and handled uncaught exceptions for better stability.
    - Added comprehensive logs for key actions to aid in troubleshooting and ensuring that all operations perform as expected.
5. User Interface Adjustments:
    - Made UI improvements to ensure that images are displayed correctly within the app, maintaining aspects ratios and ensuring high usability and aesthetics.
6. Commit and Documentation:
    - Regular commits were made to track changes effectively. Prepared detailed notes and documentation of the day's work to ensure progress is well documented and easy to follow.

### 02-23
* @expo/webpack-config@19.0.1 doesn't support expo@50.0.0
    solution:
    Remove @expo/webpack-config from package.json
    Run npm update
    Do Expo Upgrade if not done already
    Add bundler in app.json
    "web": {
        "bundler": "metro",
        }
* Deprecated dependencies have been fixed.


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
