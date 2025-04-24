import * as Location from 'expo-location';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { checkLocation } from './locationUtils';

export async function updateUserLocation(userId: string) {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('❌ Location permission not granted');
    return;
  }

  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const coords = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };

  // Step 1: Try mapping from manual city bounds
  const labelFromMapping = checkLocation(coords);

  // Step 2: Fallback to reverse geocode
  let fallbackLabel: string | null = null;
  let country: string | undefined;

  try {
    const reverseGeocode = await Location.reverseGeocodeAsync(coords);
    if (reverseGeocode?.length > 0) {
      const { city, region, isoCountryCode, country: countryName } = reverseGeocode[0];
      country = countryName || undefined;

      if (!labelFromMapping && city && region) {
        fallbackLabel = isoCountryCode === 'US'
          ? `${city}, ${region.slice(0, 2).toUpperCase()}`
          : `${city}, ${region}`;
      }
    }
  } catch (error) {
    console.warn("⚠️ Reverse geocoding failed:", error);
  }

  const finalLabel = labelFromMapping || fallbackLabel || null;

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    lastKnownLocation: {
      ...coords,
      label: finalLabel,
      timestamp: serverTimestamp(),
    },
    ...(country && { country }),
  });

  return {
    label: finalLabel,
    coords,
    country,
  };
}
