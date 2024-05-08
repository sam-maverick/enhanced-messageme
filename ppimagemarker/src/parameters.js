// Do not import custom libraries from here


// Console logging. 0=disabled, 1=normal logging, 2=verbose debugging
// NOTE: Setting this to anything other than 0 may significantly impact performance
// NOTE: Each log call (console.log()) is limited to 4096 bytes, so you won't see the full contents of image files
// https://stackoverflow.com/questions/8888654/android-set-max-length-of-logcat-messages
export const PARAM_LOGGING_LEVEL = 1;  // Change accordingly to your preference

/**
 * Name of the album where private pictures will be saved
 */
export const PARAM_PRIVATE_PICTURES_ALBUM_NAME = 'PrivatePics';

/**
 * Name of the directory where private pictures will be saved temporarily.
 * Note that this is not the directory where they will be saved permanently; 
 * the permanent directory is the one of the camera roll.
 */
export const PARAM_PRIVATE_PICTURES_TMP_DIRNAME = 'PrivatePicturesTmp';

export const PARAM_WELCOME_MESSAGE = 'Welcome to ppimagemarker. \
This apps lets you select the pictures you want to protect via the Privacy Provider framework. \
When you select a picture to protect, this app will create a copy of that picture \
with EXIF metadata indicating that it is a private picture. This copy will be saved in a separate album called '+
PARAM_PRIVATE_PICTURES_ALBUM_NAME+
'. The original will be preserved; you can delete it through the system Files app if you wish.';

