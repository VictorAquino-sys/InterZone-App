// Define the parameter list for all routes in the stack navigator
export type RootStackParamList = {
    HomeScreen: undefined;  // No parameters expected, just showing the home.
    ProfileScreen: undefined;     // Assuming the profile doesn't need parameters initially.
    LoginScreen: undefined;       // Login screen typically doesn't need parameters.
    // PostScreen: undefined;
    NameInputScreen: {userId: string};  // Simple input screen, no parameters needed unless specified.
    BottomTabs: undefined;  // Tab navigator itself doesn't receive parameters directly.
  };

  export type TabParamList = {
    Home: undefined;
    PostScreen: undefined;
};