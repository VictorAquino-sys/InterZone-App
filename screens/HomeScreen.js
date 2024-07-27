import React, { useContext, useEffect, useState } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Text, Image, TouchableOpacity, Button, FlatList } from 'react-native';
// import { auth } from '../screens/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PostsContext } from './PostsContext';
import { v4 as uuidv4 } from 'uuid'; // Import UUID library to generate unique keys

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { posts, setPosts } = useContext(PostsContext);
  const [imageOpacity, setImageOpacity] = useState(1); // State to force refresh

  useEffect(() => {
    if (route.params?.post) {
      const newPost = { ...route.params.post, id: uuidv4() }; // Generate unique id for new post
      setPosts((prevPosts) => [newPost, ...prevPosts]);
    }
  }, [route.params?.post]);

  useFocusEffect(
    React.useCallback(() => {
      // Reset image opacity when the screen is focused
      setImageOpacity(1);
    }, [])
  );

  const renderItem = ({ item }) => (
    <View style={styles.postItem}>
      <Text style={styles.postText}>{item.text}</Text>
      {/* Add other post details like user, time, etc. */}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.profilePicContainer} 
          onPress={() => {
            navigation.navigate('Profile');
          }}
          activeOpacity={0.5} // Manage active opacity here
        >
          <Image 
            source={require('../assets/unknownuser.png')} 
            style={[styles.profilePic, {opacity: imageOpacity}]} // Apply dynamic opacity
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'flex-start', // Align children to the start horizontally
    justifyContent: 'flex-start', // Align children to the start vertically
    width: '100%', // Ensure container takes full width
  },
  header: {
    flexDirection: 'row', // Ensure the header is a row for alignment
    alignItems: 'center',
    width: '100%', // Full width
    paddingHorizontal: 14, // Padding on the sides
    paddingTop: 28, // Padding on top
  },
  profilePicContainer: {
    height: 60,
    width: 60,
    borderRadius: 25,
    overflow: 'hidden',
  },
  profilePic: {
    height: '100%',
    width: '100%',
  },
  postItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%', // Ensure post items take full width
  },
  postText: {
    fontSize: 16,
  },
  listContent: {
    alignItems: 'center', // Center items of the list horizontally
  },
});
