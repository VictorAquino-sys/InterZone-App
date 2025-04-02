import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const EventsScreen = () => {
    return (
        <View style={styles.container}>
            <Text>Event Category Posts Here</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default EventsScreen;