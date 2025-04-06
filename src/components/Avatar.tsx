import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

type AvatarProps = {
  name: string;
  imageUri?: string | null;
  size?: number;
  backgroundColor?: string;
  color?: string;
};

const Avatar: React.FC<AvatarProps> = ({
  name,
  imageUri,
  size = 40,
  backgroundColor = '#ccc',
  color = '#fff'
}) => {
  // console.log("Avatar props:", { name, imageUri });  // Add this to log props being received
  const firstLetter = name ? name[0].toUpperCase() : '?'; // Default to '?' if no name is provided

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={[styles.image, { borderRadius: size / 2 }]} 
          contentFit="cover"
        />
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