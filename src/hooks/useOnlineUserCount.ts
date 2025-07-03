import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { useIsFocused } from '@react-navigation/native';
import { rtdb } from '../config/firebase';

export function useOnlineUserCount() {
    const isFocused = useIsFocused();
    const [count, setCount] = useState(0);

  useEffect(() => {
    if (isFocused) {
        setCount(Math.floor(Math.random() * 201) + 100); // 30–70
      }
    }, [isFocused]);

  return count;
}
