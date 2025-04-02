import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const RestaurantsScreen = () => {
    return (
        <View style={styles.container}>
            <Text>Restaurant Category Posts Here</Text>
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

export default RestaurantsScreen;