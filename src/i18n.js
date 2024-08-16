import { getLocales } from 'expo-localization';
import i18n from 'i18n-js';

// Import translation files
import en from './translations/en.json';
import es from './translations/es.json';

// Set up translations
i18n.translations = {
  en,
  es
};

// Set the locale once at the beginning of your app based on the device settings
i18n.locale = getLocales()[0].languageCode || 'es'; // Fallback to 'en' if unable to get languageCode
i18n.fallbacks = true;  // Fallback to another language if a translation is missing

console.log(i18n.t('welcomeMessage'));  // Example usage of the translated text

export default i18n;