(Backlog of ideas & improvements)
Convert all API calls to Firestore
Implement a dashboard for tracking user activity

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