(Backlog of ideas & improvements)
Convert all API calls to Firestore
Implement a dashboard for tracking user activity

### 4-24
    Restrict users to only allow to see nearby people instead of all InterZone Users.
    display error messages as toast/snackbar instead of alerts for a smoother UX.
    Build a debug screen that shows the user's lastKnownLocation and city-based feed

    💡 Let users set a "Home City" for fallback alerts if GPS isn’t available

    📊 Track most active cities using Firestore analytics or a charting dashboard

    🗺️ Add support for international city names and localized labels (e.g. "Lima, PE" vs "Lima, Ohio")

### 4-22
    A Firebase dashboard query to rank posts by view count
    let the user zoom when click on photos.

### 4-17
    - Fix the following:
     LOG  VirtualizedList: You have a large list that is slow to update - make sure your renderItem function renders components that follow React performance best practices like 
PureComponent, shouldComponentUpdate, etc. {"contentLength": 8744.380859375, "dt": 3247, "prevDt": 4605}
    - Add three dots under each comment for blocking, spam, report.


### 4-14
    Let users add location for their business for easy access.

### 4-10
    ★ eas-cli@16.3.0 is now available.
    To upgrade, run:
    npm install -g eas-cli
    Proceeding with outdated version.

### 4-09
    Add category "Games"
    Add push notifications when a new message is received
    Push Notification Settings: Let drivers subscribe to alerts for specific zones.
    Time-limited posts: Posts auto-expire after X hours since alerts like these are time-sensitive.

### 4-08
    Tag location reports with a source: 'fallback' field in Firestore to filter these cases.
    Add a toast/snackbar confirmation instead of a second Alert.alert() for less intrusive experience.
    Use Platform.select() if ever want platform-specific messaging (iOS vs Android).

### 4-07
- Needs fix: (Done)
 LOG  [expo-image]: Prop "resizeMode" is deprecated, use "contentFit" instead (Done)
 LOG  VirtualizedList: You have a large list that is slow to update - make sure your renderItem function renders components that follow React performance best practices 
like PureComponent, shouldComponentUpdate, etc. {"contentLength": 8309.3330078125, "dt": 2857, "prevDt": 1891}

3-01
1. Transition to "com.interzona.app" (instead of "com.zhd.app") on Android to be consistent with Apple. I am creating a Bundle ID "com.interzone.app" on Apple.

02-13 (Done)
1. Fix Fetching Post on First Load
The `fetchPostByCity(city)` function only runs when `city` changes, but `city` is initially `null`, meaning no posts are fectched on the first render.
`fetchLocation()` is running, but it's not immediately triggering `fetchPostByCity(city)`. It only updates after the user's location is found.

fix:
- Call fetchPostsByCity(city) inside fetchLocation() once the city is set.

2. Fix Location Fetching Bug (Done)
`console.log("Found city:", city);` inside `fetchLocation()` always logs null because `setCity(cityName) is async.
This means posts never load immediately because `city` ins't updated in time. 

fix:
Modify fetchLocation() to call fetchPostsByCity(cityName) immediately after setting cityName.