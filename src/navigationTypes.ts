// Define the parameter list for all routes in the stack navigator
export type RootStackParamList = {
    HomeScreen: undefined;  // No parameters expected, just showing the home.
    ProfileScreen: undefined;     // Assuming the profile doesn't need parameters initially.
    LoginScreen: undefined;       // Login screen typically doesn't need parameters.
    NameInputScreen: {userId: string};  // Simple input screen, no parameters needed unless specified.
    BottomTabs: undefined;  // Tab navigator itself doesn't receive parameters directly.
    CategoryScreen: { categoryKey: string; title: string }; // Generic route for all categories.
    
    // Add category screens
    // PetpalsScreen: undefined;    // Add a route for the Petpals category.
    // MusicScreen: undefined;      // Add a route for the Music category.
    // EventsScreen: undefined;     // Add a route for the Events category.
    // NewsScreen: undefined;       // Add a route for the News category.
    // RestaurantsScreen: undefined; // Add a route for the Restaurants category.
    // StudyHubScreen: undefined;   // Add a route for the Study Hub category.
    // DealsScreen: undefined;      // Add a route for the Deals category.
    // RandomScreen: undefined;
  };

  export type TabParamList = {
    Home: undefined;
    PostScreen: undefined;
};