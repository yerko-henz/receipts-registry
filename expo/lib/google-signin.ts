import { NativeModules, Platform } from 'react-native';

/**
 * Checks if the Google Sign-In native module is available.
 * In development builds without the module (like standard Expo Go), 
 * this will be false and we avoid loading the actual library to prevent crashes.
 */
const isNativeModuleAvailable = 
  Platform.OS !== 'web' && 
  (!!NativeModules.RNGoogleSignin || 
   !!NativeModules.RNGoogleSigninModule || 
   !!(global as unknown as { RNGoogleSignin: boolean }).RNGoogleSignin);

let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
let statusCodes: typeof import('@react-native-google-signin/google-signin').statusCodes | Record<string, string> = {};

if (isNativeModuleAvailable) {
  try {
    // We use require instead of import to delay loading until we've checked for native support.
    // This prevents the "RNGoogleSignin could not be found" crash at import time.
    const module = require('@react-native-google-signin/google-signin');
    GoogleSignin = module.GoogleSignin;
    statusCodes = module.statusCodes;
  } catch (e) {
    console.warn('Google Sign-In native module detected but library failed to load:', e);
  }
}

export { GoogleSignin, statusCodes, isNativeModuleAvailable };
