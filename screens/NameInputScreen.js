import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NameInputScreen = ({ route, navigation }) => {
    const [name, setName] = useState('');
    const { userId } = route.params;

    const saveName = async () => {
        // Save the name to AsyncStorage
        await AsyncStorage.setItem('userName' + userId, name);
        console.log("Saved name:", name); // Debug: Check if the name is logged correctly
        navigation.navigate('Home');  // Or wherever you wish to navigate
    };

    return (
        <View style={styles.container}>
            <TextInput
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
            <Button title="Save Name" onPress={saveName} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    input: {
        width: '100%',
        height: 40,
        marginVertical: 10,
        borderWidth: 1,
        padding: 10,
    },
});

export default NameInputScreen;
