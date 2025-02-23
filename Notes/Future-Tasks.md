(Backlog of ideas & improvements)
Convert all API calls to Firestore
Implement a dashboard for tracking user activity

02-13
1. Fix Fetching Post on First Load
The `fetchPostByCity(city)` function only runs when `city` changes, but `city` is initially `null`, meaning no posts are fectched on the first render.
`fetchLocation()` is running, but it's not immediately triggering `fetchPostByCity(city)`. It only updates after the user's location is found.

fix:
- Call fetchPostsByCity(city) inside fetchLocation() once the city is set.

2. Fix Location Fetching Bug
`console.log("Found city:", city);` inside `fetchLocation()` always logs null because `setCity(cityName) is async.
This means posts never load immediately because `city` ins't updated in time. 

fix:
Modify fetchLocation() to call fetchPostsByCity(cityName) immediately after setting cityName.