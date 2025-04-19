// Define the parameter list for all routes in the stack navigator
export type RootStackParamList = {
    HomeScreen: undefined;  // No parameters expected, just showing the home.
    ProfileScreen: undefined;     // Assuming the profile doesn't need parameters initially.
    LoginScreen: undefined;       // Login screen typically doesn't need parameters.
    NameInputScreen: {userId: string};  // Simple input screen, no parameters needed unless specified.
    BottomTabs: undefined;  // Tab navigator itself doesn't receive parameters directly.
    CategoryScreen: { categoryKey: string; title: string }; // Generic route for all categories.
    FriendsHome: undefined;
    People: undefined;
    Requests: undefined;
    UserProfile: { userId: string };
    FriendsList: undefined;
    // Chat: { otherUserId: string }; // ✅ Add this line
    Terms: undefined;
    Home: undefined;
    BlockedUsers: undefined;
    DeleteAccount: undefined;
    PostDetail: { postId: string};
    ChatScreen: { friendId: string; friendName: string };
    MessagesScreen: undefined;

  };

  export type TabParamList = {
    Home: undefined;
    PostScreen: undefined;
};