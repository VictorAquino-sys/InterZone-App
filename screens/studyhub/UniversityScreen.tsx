import React, { useEffect, useState } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Text, View, StyleSheet } from 'react-native';
import RateMyProfessorsScreen from './RateMyProfessorsScreen';
import SchoolDiscussionScreen from './SchoolDiscussionScreen';
import i18n from '@/i18n';
import { useVerifiedSchool } from '@/contexts/verifySchoolContext';

const Tab = createMaterialTopTabNavigator();

type UniversityScreenRouteProp = RouteProp<
    { UniversityScreen: { universityId: string; universityName: string } },
    'UniversityScreen'
>;

const UniversityScreen = () => {
    const route = useRoute<UniversityScreenRouteProp>();
    // const { universityId, universityName } = route.params;
    const { school, loading } = useVerifiedSchool();

    const universityId = route.params?.universityId || school?.universityId;
    const universityName = route.params?.universityName || school?.universityName;

    if (loading) {
        return (
          <View style={styles.centered}>
            <Text style={{ color: '#666' }}>{i18n.t('discussion.loading')}</Text>
          </View>
        );
      }
  
      if (!universityId || !universityName) {
          return (
            <View style={styles.centered}>
              <Text style={{ color: 'red' }}>Missing university information.</Text>
            </View>
          );
      }

    return (
        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: { fontSize: 14 },
            tabBarIndicatorStyle: { backgroundColor: '#007AFF' },
          }}
        >
          <Tab.Screen
            name="RateMyProfessors"
            options={{ title: i18n.t('university.rateTab') }}
          >
            {() => (
              <RateMyProfessorsScreen
                universityId={universityId}
                universityName={universityName}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Discussion"
            options={{ title: i18n.t('university.discussionTab') }}
          >
            {() => (
              <SchoolDiscussionScreen
                universityId={universityId}
                universityName={universityName}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      );
    };
    
    const styles = StyleSheet.create({
      centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

export default UniversityScreen;