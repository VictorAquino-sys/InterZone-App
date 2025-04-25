// src/utils/analytics.ts
import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
} from '@react-native-firebase/analytics';

// Always use getAnalytics with getApp for modular style
const analytics = getAnalytics(getApp());

export async function logScreen(screenName: string) {
  try {
    await firebaseLogEvent(analytics, 'screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenName,
    });
  } catch (err) {
    console.warn('Analytics screen error:', err);
  }
}

export async function logEvent(name: string, params: Record<string, any> = {}) {
  try {
    await firebaseLogEvent(analytics, name, params);
  } catch (err) {
    console.warn('Analytics event error:', err);
  }
}

export async function setUserProps(uid: string, props: Record<string, any> = {}) {
  try {
    await firebaseSetUserId(analytics, uid);
    await firebaseSetUserProperties(analytics, props);
    await firebaseLogEvent(analytics, 'user_properties_updated', props);
  } catch (err) {
    console.warn('Analytics userProps error:', err);
  }
}