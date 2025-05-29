import { ref, onDisconnect, set, serverTimestamp } from "firebase/database";
import { rtdb } from "../config/firebase";
import { AppState } from 'react-native';

let appStateListener: any = null;
let currentUid: string | null = null;

export function setUserOnlineStatus(user: { uid: string }) {
  if (!user?.uid) return;

  const userStatusRef = ref(rtdb, `presence/${user.uid}`);

  // If this is a new user, clean up any old listeners
  if (currentUid && currentUid !== user.uid && appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
  currentUid = user.uid;

  // Mark as online
  set(userStatusRef, {
    state: 'online',
    lastChanged: serverTimestamp(),
  });

  onDisconnect(userStatusRef).remove();

  // Only add the AppState listener once per user
  if (!appStateListener) {
    appStateListener = AppState.addEventListener('change', (state) => {
      if (!currentUid) return; // In case user logs out
      const userStatusRef = ref(rtdb, `presence/${currentUid}`);
      if (state === 'active') {
        set(userStatusRef, {
          state: 'online',
          lastChanged: serverTimestamp(),
        });
        onDisconnect(userStatusRef).remove();
      } else if (state === 'inactive' || state === 'background') {
        set(userStatusRef, {
          state: 'offline',
          lastChanged: serverTimestamp(),
        });
      }
    });
  }
}

// Optional: Cleanup function to call on logout
export function clearUserOnlineStatus(uid?: string) {
  if (uid) {
    const userStatusRef = ref(rtdb, `presence/${uid}`);
    set(userStatusRef, {
      state: 'offline',
      lastChanged: serverTimestamp(),
    });
  }
  if (appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
  currentUid = null;
}
