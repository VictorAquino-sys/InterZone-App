import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Text, View, StyleSheet } from 'react-native';
import RateMyProfessorsScreen from './RateMyProfessorsScreen';
import SchoolDiscussionScreen from './SchoolDiscussionScreen';
import i18n from '@/i18n';

const Tab = createMaterialTopTabNavigator();

type UniversityScreenRouteProp = RouteProp<
    { UniversityScreen: { universityId: string; universityName: string } },
    'UniversityScreen'
>;

const UniversityScreen = () => {
    const route = useRoute<UniversityScreenRouteProp>();
    const { universityId, universityName } = route.params;

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarLabelStyle: { fontSize: 14 },
                tabBarIndicatorStyle: { backgroundColor: '#007AFF'},
            }}
        >
            <Tab.Screen
                name="RateMyProfessors"
                options={{ title: i18n.t('university.rateTab') }}
            >
                {() => <RateMyProfessorsScreen universityId={universityId} universityName={universityName} />}
            </Tab.Screen>
            <Tab.Screen
                name="Discussion"
                options={{ title: i18n.t('university.discussionTab') }}
            >
                {() => <SchoolDiscussionScreen universityId={universityId} universityName={universityName} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
};

export default UniversityScreen;