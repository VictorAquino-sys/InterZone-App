import React, { useContext, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Button, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'
import { PostsContext } from './PostsContext';
import { v4 as uuidv4 } from 'uuid';

const PostScreen = ({ navigation }) => {
  const [postText, setPostText] = useState('');
  const { setPosts } = useContext(PostsContext);

  const handleDone = () => {
    if (!postText.trim()) {
      Alert.alert("Empty Post", "Please enter some text before posting.");
      return;
    }
    const newPost = { id: uuidv4(), text: postText };
    setPosts((prevPosts) => [newPost, ...prevPosts]);
    navigation.navigate('HomeStack', { screen: 'Home'});
    setPostText(''); // Clear the input field
  };

    return (
      <View style={StyleSheet.container}>
          <TextInput
            multiline
            placeholder="What's on your mind, neighbor?"
            style={{ height: 200, padding: 10, backgroundColor: 'white' }}
            value={postText}
            onChangeText={setPostText}
          />
          <Button
            title="Done"
            onPress={handleDone}
          />
          <View style={styles.iconsContainer}>
              <TouchableOpacity>
                  <Ionicons name="image-outline" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity>
                  <Ionicons name="location-outline" size={24} color="black" />
              </TouchableOpacity>
          </View>
      </View>
    );
};

export default PostScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: 'white',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    postButton: {
      backgroundColor: '#b2ff59',
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 6,
    },
    postButtonText: {
      color: 'black',
      fontWeight: 'bold',
    },
    textInput: {
      marginTop: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
      fontSize: 18,
      flex: 1,
      textAlignVertical: 'top',
    },
    iconsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 20,
    },
    createOptions: {
      marginTop: 20,
    },
    createOptionButton: {
      backgroundColor: '#f1f1f1',
      padding: 10,
      borderRadius: 10,
      marginBottom: 10,
    },
    createOptionText: {
      fontSize: 16,
    },
  });
  
