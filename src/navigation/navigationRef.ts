// src/navigation/navigationRef.ts
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigationTypes'; // Adjust path as needed

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
