import React from 'react';
import { View, StyleSheet } from 'react-native';
import NewsFeedContent from '@/components/NewsFeedContent';

const NewsFeedScreen = () => {
  return (
    <View style={styles.container}>
      <NewsFeedContent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default NewsFeedScreen;