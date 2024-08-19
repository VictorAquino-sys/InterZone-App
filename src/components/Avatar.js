import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const Avatar = ({ name, imageUri, size = 40, backgroundColor = '#ccc', color = '#fff' }) => {
  console.log("Avatar props:", { name, imageUri });  // Add this to log props being received
  const firstLetter = name ? name[0].toUpperCase() : '?'; // Default to '?' if no name is provided

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={[styles.image, { borderRadius: size / 2 }]} />
      ) : (
        <Text style={[styles.text, { color, fontSize: size / 2 }]}>{firstLetter}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',  // Ensures nothing extends beyond the boundary of the view
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontWeight: 'bold',
  },
});

export default Avatar;