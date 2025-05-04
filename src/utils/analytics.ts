// src/utils/analytics.ts
import { getApp } from '@react-native-firebase/app';
import {
  getAnalytics,
  logEvent as firebaseLogEvent,
  setUserId as firebaseSetUserId,
  setUserProperties as firebaseSetUserProperties,
} from '@react-native-firebase/analytics';

const analytics = getAnalytics(getApp());

/**
 * Logs a screen view. Uses a custom event name to avoid reserved ones.
 */
export async function logScreen(screenName: string) {
  try {
    await firebaseLogEvent(analytics, 'custom_screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (err) {
    console.warn('📉 Analytics screen log error:', err);
  }
}

/**
 * Logs a custom event. Avoids reserved Firebase event names.
 */
export async function logEvent(name: string, params: Record<string, any> = {}) {
  const reservedEvents = new Set([
    'app_clear_data', 'app_remove', 'app_update', 'error', 'first_open',
    'in_app_purchase', 'notification_dismiss', 'notification_foreground',
    'notification_open', 'notification_receive', 'os_update', 'screen_view',
    'session_start', 'user_engagement', 'app_exception'
  ]);

  if (reservedEvents.has(name)) {
    console.warn(`🚫 Attempted to log reserved event name "${name}". Renaming it to "custom_${name}"`);
    name = `custom_${name}`;
  }

  try {
    await firebaseLogEvent(analytics, name, params);
  } catch (err) {
    console.warn('📉 Analytics event log error:', err);
  }
}

/**
 * Sets user ID and user properties. Logs a custom event for debugging.
 */
export async function setUserProps(uid: string, props: Record<string, any> = {}) {
  try {
    await firebaseSetUserId(analytics, uid);
    await firebaseSetUserProperties(analytics, props);

    // Optional: Log for debugging, not tracked as reserved name
    await firebaseLogEvent(analytics, 'custom_user_properties_updated', props);
  } catch (err) {
    console.warn('📉 Analytics setUserProps error:', err);
  }
}
