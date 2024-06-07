// Do not import custom libraries from here

// NOTE: When changes are made to files that do not contain components, these changes are not pulled to running apps in real time. You need to re-launch the app to force a re-download.

import * as Device from 'expo-device';

// When set to true, the PP client app will wrap and attempt to unwrap private pictures even when not enrolled.
// Useful when running the app from APK loaded via adb, and to check that protections work regardless of app logic.
export const PARAM_DEBUG_MODE = true;

/** 
 * Show developer info in PPSettings tab
*/
export const PARAM_SHOW_EXTRA_INFO = false;

/**
 * The name identifiers of the PP platform
 */
export const PP_PLATFORM_NICKNAME = "gen";
export const PP_PLATFORM_NAME = "generic";


export const PARAM_SERVER_API_URL = 
'https://' + // Change to http or https accordingly to your environment
`ppserver-${PP_PLATFORM_NICKNAME}` +
'.localnet' + 
':3020'; // Change port if needed

// Console logging. 0=disabled, 1=normal logging, 2=verbose debugging
// NOTE: Setting this to anything other than 0 may significantly impact performance
// NOTE: Each log call (console.log()) is limited to 4096 bytes, so you won't see the full contents of image files
// See:
// https://stackoverflow.com/questions/8888654/android-set-max-length-of-logcat-messages
export const PARAM_LOGGING_LEVEL = 1;  // Change accordingly to your preference

export const PARAM_GOOGLE_CLOUD_PROJECT_NUMBER = 48509944813;

// The value is not really important. What is important is to remember it and that it is the same as the one configured server side
export const PARAM_IOS_KEY_IDENTIFIER = {
    PPIntegrity: 'iosKeypairPPIntegrity', 
    PPEnrollment: 'iosKeypairPPEnrollment',
 };

// The custom scheme of our app, in lowercase
export const PARAM_OUR_SCHEME = 'pripro';

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
 
/**
 * Selected cryptographic algorithms and parameters used to wrap private pictures
 */
export const PARAM_PP__CRYPTO = {
    'null_crypto': false,  // Set to true to do null-encryption for testing purposes. Do not set to true in production!!
    'stage1': {
        'encryption_algorithm': 'aes-256-cbc',
        //Since the key is not a human password but random bits, we do not need to pbkdfify. If pbkdf needs to be enabled, check the source code of wrapops.js
        //'pbkdf_algorithm': 'sha512',
        //'pbkdf_iterations': 100000,
    },
    'stage2': {
        'encryption_algorithm': 'aes-256-cbc',
    },
    'stage3': {
        'encryption_algorithm': 'rsa',  // Only 'rsa' is supported; this parameter is not read. It is here for informational purposes only.
        // https://github.com/margelo/react-native-quick-crypto
        // https://github.com/tradle/react-native-crypto
    },
};

/**
 * Library to use for PNG implementation for the typing of chunk.type and chunk.data.
 * Set to 's' for using String.
 * Set to 'b' for using Buffer in all chunks, except on ppPp chunk type and data which are string. Requires PARAM_IMPLEMENTATION_OPTION_B64='n'.
 * NOTE: The 'b' option yields the same performance when converting to BASE64 in the last step of WrapPicture, but it has degraded performance in png-metadata because of slow writes
 * Note that `new String('something')` yields a String *object*, not a string primitive.
 */
export const PARAM_IMPLEMENTATION_OPTION_PNG = 's';

/**
 * Library to use for base64 encoding/decoding.
 * Set to 's' for input as string.
 * Set to 'n' for using buff.toString('base64'), with input as Buffer. Requires PARAM_IMPLEMENTATION_OPTION_PNG='b'
 * Set to 'q' for using 'react-native-quick-base64' module, with input as ArrayBuffer. Experimental.
 */
export const PARAM_IMPLEMENTATION_OPTION_B64 = 's';

/**
 * Library to use for CRC32.
 * Set to 'n' for using png-metadata implementation.
 * Set to 't' for using 'turbo-crc32' module.
 */
export const PARAM_IMPLEMENTATION_OPTION_CRC32 = 'n';

/**
 * Format for the wrapped image artifact as returned by WrapPicture()
 * Experimental.
 * 'base64' works.
 * 'utf8' corrupts data because it is not compatible with arbitrary binary data.
*/
export const PARAM_IMPLEMENTATION_ARTIFACT_FORMAT = 'base64';