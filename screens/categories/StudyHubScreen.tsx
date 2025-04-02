import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const StudyHubScreen = () => {
    return (
        <View style={styles.container}>
            <Text>Study Hub Category Posts Here</Text>
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

export default StudyHubScreen;