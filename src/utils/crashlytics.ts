// src/utils/crashlytics.ts
import {
    getCrashlytics,
    crash as firebaseCrash,
    recordError as firebaseRecordError,
    log as firebaseLog,
  } from '@react-native-firebase/crashlytics';
  
  const crashlytics = getCrashlytics(); // ✅ No getApp() needed
  
  // 🔥 For test crashes
  export function forceCrash() {
    firebaseLog(crashlytics, '🔥 Force crash button pressed on HomeScreen');
    firebaseCrash(crashlytics); // Crash intentionally
  }
  
  // 💥 For logging handled errors with optional context
  export async function recordHandledError(error: unknown, context?: string) {
    try {
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      if (context) {
        firebaseLog(crashlytics, `🧠 Context: ${context}`);
      }
      await firebaseRecordError(crashlytics, wrappedError);
    } catch (e) {
      console.warn('Crashlytics failed to record handled error:', e);
    }
  }
  
  // 🧩 Optional: add breadcrumbs / debug logs
  export function logToCrashlytics(message: string) {
    try {
      firebaseLog(crashlytics, message);
    } catch (err) {
      console.warn('Failed to log to Crashlytics:', err);
    }
  }
  