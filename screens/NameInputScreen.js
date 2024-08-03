import React, { useState, useContext } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserContext } from './UserContext'; // Ensure you import useUser correctly

const NameInputScreen = ({ route, navigation }) => {
    const [name, setName] = useState('');
    const { userId } = route.params;
    // const { setUser } = useContext(UserContext); // Use the context

    const saveName = async () => {
        try {
            await AsyncStorage.setItem('userName' + userId, name); // Simplify this for demo purposes
            // setUser({ name: name }); // Assuming setUser is set up to handle this correctly
            console.log("Saved name:", name); // Debug: Check if the name is logged correctly
            navigation.navigate('Home');  // Navigate to Home after saving
        } catch (error) {
            console.error('Failed to save name', error);
        }
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
