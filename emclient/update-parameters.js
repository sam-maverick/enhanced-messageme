// Parameters of the Updated OS layer

// Console logging. 0=disabled, 1=normal logging, 2=verbose debugging
// NOTE: Setting this to anything other than 0 may significantly impact performance
// NOTE: Each log call (console.log()) is limited to 4096 bytes, so you won't see the full contents of image files
// https://stackoverflow.com/questions/8888654/android-set-max-length-of-logcat-messages
export const PARAM_LOGGING_LEVEL = 1;  // Change accordingly to your preference

/**
 * Timeout after which a the private picture selection will give error if no aswer is received from the pp client app.
 * This parameter is for the cases where a user selects a picture and the app requests
 * to put an envelope to send it to another user, and the ppclient does not respond because
 * the user manually cancelled the process by killing the ppclient, or otherwise.
 */
export const PARAM_PP__SELECT_TIMEOUT_MS = 60*1000;

/**
 * Timeout after which a the private picture display request will give error if the pp client app does not call back.
 * This parameter is for the cases where a user taps onto a received picture and the app requests
 * to display it, and the ppclient does not call back (with a deep link or intent) to the messaging app because
 * the user manually cancelled the process by killing the ppclient, or otherwise.
 * This makes sure that Lightbox.js processing is blocked until *after* the call to AppLink.maybeOpenURL() is issued
 */
export const PARAM_PP__DISPLAY_TIMEOUT_MS = 1*1000;


/** 
 * URL for accessing the ppclient's screen for wrapping a private picture. With trailing /
 */
export const PARAM_PP__SERVICE_WRAP_BASE_URL = 'pripro://wrapoperation/';

/** 
 * PP app name
 */
export const PARAM_PP__SERVICE_APPNAME = 'ppclient';

/** 
 * PP app ID on the App Store (iOS), in string format
 */
export const PARAM_PP__SERVICE_IOSAPPID = '6502830043';

/** 
 * App Store's locale (iOS) where to find the PP app
 */
export const PARAM_PP__SERVICE_IOSAPPSTORELOCALE = 'us';

/** 
 * PP app package identifier on the Play Store (Android)
 */
export const PARAM_PP__SERVICE_PLAYSTOREID = 'pt.lasige.safex.ppclient';

/**
 * Protocol/Scheme of this app, to handle deep links
 * This must be consistent with the configuration in app.json
 */
export const PARAM_PP__APP_URL_SCHEME = 'enhmsm';

/**
 * Hostname part of the link that the ppclient will call after processing a picture selection request.
 */
export const PARAM_PP__APP_URL_MESSAGING_SELECTOR_HOSTNAME = 'backfromPPselector';

/**
 * Hostname part of the link that the ppclient will call after processing a picture display request.
 */
export const PARAM_PP__APP_URL_MESSAGING_DISPLAY_HOSTNAME = 'backfromPPdisplay';

/**
 * Charset and length of the authentication string that the app will send to the ppclient to verify the response.
 * Characters must be URL safe
 */
export const PARAM_PP__CHARSET_AUTH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const PARAM_PP__LENGTH_AUTH = 16;

/**
 * Folder name where temporary image files are stored for exchange with other apps, within the messaging app.
 * Only applicable to Android.
 */
export const PARAM_PP__APP_TMP_FOLDER_NAME = 'ppSharedImages';

/**
 * Android name given to the messaging app
 */
export const PARAM_PP__APP_ANDROID_FILEPROVIDER_AUTHORITY = 'pt.lasige.safex.enhmessageme.MyFileProvider';

/**
 * Android name given to the PP client app
 */
export const PARAM_PP__PPCLIENT_ANDROID_NAME = 'pt.lasige.safex.ppclient';


