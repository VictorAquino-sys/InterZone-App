import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NewsScreen = () => {
    return (
        <View style={styles.container}>
            <Text>News Category Posts Here</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignContent: 'center',
    },
});

export default NewsScreen;