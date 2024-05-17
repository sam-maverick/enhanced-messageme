// Do not import custom libraries from here

// NOTE: When changes are made to files that do not contain components, these changes are not pulled to running apps in real time. You need tore-launch the app to force a re-download.

import * as Device from 'expo-device';

/**
 * Quality of the image (resampling)
 * // from 0 to 1, float. 0=lowest resolution, 1=highest resolution
 *  NOTE: In some devices, only 1 is supported!!!! Check: https://github.com/expo/expo/issues/19512
 * Check: https://github.com/react-native-image-picker/react-native-image-picker/blob/a5d2938cd19e1d26614bd78c89d3e02467da28a6/docs/Reference.md#options
 */ 
export const PARAM_IMAGE_PICKER_QUALITY = 1;

let server_host = '';
if (Device.isDevice) {
    server_host = '192.168.12.1';  // Change accordingly to your network environment.
} else {
    server_host = '10.0.2.2';  // Do not change. 10.0.2.2 is used as loopback address of the emulator host by Expo Go.
}

export const PARAM_SERVER_API_URL = 'http://' + server_host + ':3020'; // Change port if needed

export const PARAM_SERVER_WS_URL = 'ws://' + server_host + ':3021'; // Change port if needed

export const PARAM_IMAGES_DIRNAME = 'chatHistoryPictures';  // You shouldn't need to change this

// Console logging. 0=disabled, 1=normal logging, 2=verbose debugging
// NOTE: Setting this to anything other than 0 may significantly impact performance
// NOTE: Each log call (console.log()) is limited to 4096 bytes, so you won't see the full contents of image files
// https://stackoverflow.com/questions/8888654/android-set-max-length-of-logcat-messages
export const PARAM_LOGGING_LEVEL = 2;  // Change accordingly to your preference

export const PARAM_GOOGLE_CLOUD_PROJECT_NUMBER = 48509944813;

// The value is not really important. What is important is to remember it and that it is the same as the one configured server side
export const PARAM_IOS_KEY_IDENTIFIER = {
    PPIntegrity: 'iosKeypairPPIntegrity', 
    PPEnrollment: 'iosKeypairPPEnrollment',
 };

// The custom scheme of our app, in lowercase
export const PARAM_OUR_SCHEME = 'pripro';

// When set to true, the PP client app will wrap and attempt to unwrap private pictures even when not enrolled.
// Useful when running the app from APK loaded via adb, and to check that protections work regardless of app logic.
export const PARAM_DEBUG_MODE = true;


/** 
 * ppimagemarker app name
*/
export const PARAM_PP__IMAGEMARKER_APPNAME = 'ppimagemarker';

/** 
 * ppimagemarker app ID on the App Store (iOS), in string format
*/
export const PARAM_PP__IMAGEMARKER_IOSAPPID = '6502830634';

/** 
 * App Store's locale (iOS) where to find the ppimagemarker app
*/
export const PARAM_PP__IMAGEMARKER_IOSAPPSTORELOCALE = 'us';

/** 
 * ppimagemarker app package identifier on the Play Store (Android)
*/
export const PARAM_PP__IMAGEMARKER_PLAYSTOREID = 'pt.lasige.safex.ppimagemarker';
 
/**
 * Deep link to ppimagemarker's main activity
 */
export const PARAM_PP__IMAGEMARKER_URL = 'ppimagemarker://pptagging';
 

/**
 * Maximum processing time. Applies both to wrapping and unwrapping operations.
 */
export const PARAM_PP__PROCESSING_TIMEOUT_MS = 3 * 60 * 1000;
 
export const PARAM_PP__CRYPTO = {
    'null_crypto': false,  // Set to true to do null-encryption for testing purposes. Do not set to true in production!!
    'stage1': {
        'encryption_algorithm': 'aes-256-cbc',
        //Since the key is not a human password but random bits, we do not need to pbkdfify. If pbkdf needs to be enabled, check the source code of wrapops.js
        //'pbkdf_algorithm': 'sha512',
        //'pbkdf_iterations': 100000,
    },
    'stage2': {
        'encryption_algorithm': 'rsa',  // Only 'rsa' is supported
    },
};
