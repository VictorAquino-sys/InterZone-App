import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const RandomScreen = () => {
    return (
        <View style={styles.container}>
            <Text>Random Category Posts Here</Text>
        </View>
    );
};

const styles = StyleSheet.create ({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default RandomScreen;