import Reat from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

type CategoryScreenRouteProp = RouteProp<{ params: { categoryKey: string; title: string; } }, 'params'>;

const CategoryScreen = () => {
    const route = useRoute<CategoryScreenRouteProp>();
    // You could pass category key or other parameters to the screen
    // and use them to determine what content to load and display.

    return (
        <View style={styles.container}>
            <Text>Category: {route.params?.categoryKey}</Text>
            <Text>Title: {route.params?.title}</Text>
            {/*Display the content based on the category */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignContent: 'center'
    }
});

export default CategoryScreen;