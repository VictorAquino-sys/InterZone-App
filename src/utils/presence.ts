import { ref, onDisconnect, set, serverTimestamp } from "firebase/database";
import { rtdb } from "../config/firebase";
import { AppState } from 'react-native';

let appStateListenerAdded = false;

export function setUserOnlineStatus(user: { uid: string }) {
  if (!user?.uid) return;
  const userStatusRef = ref(rtdb, `presence/${user.uid}`);

  // Mark as online
  set(userStatusRef, {
    state: 'online',
    lastChanged: serverTimestamp(),
  });

  // Remove presence when user disconnects
  onDisconnect(userStatusRef).remove();

  // Only add the AppState listener once
  if (!appStateListenerAdded) {
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        set(userStatusRef, {
          state: 'online',
          lastChanged: serverTimestamp(),
        });
        onDisconnect(userStatusRef).remove();
      } else if (state.match(/inactive|background/)) {
        set(userStatusRef, {
          state: 'offline',
          lastChanged: serverTimestamp(),
        });
      }
    });
    appStateListenerAdded = true;
  }
}
