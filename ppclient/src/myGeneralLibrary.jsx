//import { StatusBar } from 'expo-status-bar';
import React, {useState} from 'react';
import { StyleSheet, Button, Text, TextInput, View, SafeAreaView, Alert, Platform } from 'react-native';

//import Storage from 'react-native-storage';

import * as FileSystem from 'expo-file-system';

import { Asset } from 'expo-asset';

import { PARAM_IMAGES_DIRNAME, PARAM_LOGGING_LEVEL, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER, PARAM_PP__CRYPTO } from './parameters.js';


import storage from './storage/storageApi.js';

const Buffer = require("buffer").Buffer;

import ReactNativeBlobUtil from 'react-native-blob-util';


// NOTE: When changes are made to files that do not contain components, these changes are not pulled to running apps in real time. You need to re-launch the app to force a re-download.


let LogMeUsername = false;



export async function ReadMyFileStream (path, mode) {
  LogMe(1,'ReadMyFileStream: Called');
  let data = '';
  const ifstream = await ReactNativeBlobUtil.fs.readStream(
      // file path
      path,
      // encoding, should be one of `base64`, `utf8`, `ascii`
      mode,
      // (optional) buffer size, default to 4096 (4095 for BASE64 encoded data)
      // when reading file in BASE64 encoding, buffer size must be multiples of 3.
      //
      // NOTE: 4095 gives bad performance.
      //
      4096*3*60
  );
  LogMe(1,'ReadMyFileStream: ifstream object created');
  return new Promise((resolve, reject) => {
      ifstream.onError(detail => {
          LogMe(1,'ReadMyFileStream: Error');
          reject(detail);
      });
      ifstream.onEnd(() => {
          LogMe(1,'ReadMyFileStream: Finished reading');
          resolve(data);
      });
      ifstream.open();
      ifstream.onData(chunk => {       
          //LogMe(2,'ReadMyFileStream: Read chunk of data');
          data += chunk;
      });
  });
}



export async function WriteMyFileStream (path, mode, append, data) {
  LogMe(1,'WriteMyFileStream: Called');
  const ofstream = await  ReactNativeBlobUtil.fs.writeStream(
    path,
    // encoding, should be one of `base64`, `utf8`, `ascii`
    mode,
    // should data append to existing content ?
    append
  );
  LogMe(1,'WriteMyFileStream: ofstream object created');
  return new Promise((resolve, reject) => {
    LogMe(1,'WriteMyFileStream: Writing');          
    ofstream.write(data)
    .then(ofstream => {
      LogMe(1,'WriteMyFileStream: Closing');      
      ofstream.close()
      .then(() => {
        LogMe(1,'WriteMyFileStream: Resolving');      
        resolve();
      })
      .catch(detail => {
        LogMe(1,'ReadMyFileStream: Error');
        reject(detail);
      });
    })
    .catch(detail => {
      LogMe(1,'ReadMyFileStream: Error');
      reject(detail);
    });
  });
}



export function EncodeFromB64ToBuffer (str) {
  LogMe(1,'EncodeFromB64ToBuffer() called');
  return Buffer.from(str, 'base64');  // Returns a Buffer
}

export function EncodeFromBufferToB64 (buff) {
  LogMe(1,'EncodeFromBbufferToB64() called');
  return buff.toString('base64');  // Returns a String
}

export function EncodeFromB64ToBinary (str) {  // Affected by caveat: https://nodejs.org/api/crypto.html#using-strings-as-inputs-to-cryptographic-apis
  LogMe(1,'EncodeFromB64ToBinary() called');
  return Buffer.from(str, 'base64').toString('binary');  // Returns a String
}

export function EncodeFromBinaryToB64 (str) {
  LogMe(1,'EncodeFromBinaryToB64() called');
  return Buffer.from(str, 'binary').toString('base64');  // Returns a String
}

export function EncodeFromB64ToUTF8 (str) {
  LogMe(1,'EncodeFromB64ToUTF8() called');
  return Buffer.from(str, 'base64').toString('utf8');  // Returns a String
}

export function EncodeFromUTF8ToB64 (str) {
  LogMe(1,'EncodeFromUTF8ToB64() called');
  return Buffer.from(str, 'utf8').toString('base64');  // Returns a String
}



export function UpdateLogMeUsername (theusername) {
    LogMeUsername = theusername;
}

export function LogMe(level, message) {
    if (level <= PARAM_LOGGING_LEVEL) {
        let usernameHeader = '';
        if (! LogMeUsername === false) {
            usernameHeader = '['+LogMeUsername+']: ';
        }
        console.log('(ppclient) '+usernameHeader + message);
    }
}

export const AsyncAlert = async (message, title) => new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Ok',
          onPress: () => {
            resolve('YES');
          },
        },
      ],
      { cancelable: false },
    );
  });

export async function ErrorAlertAsync(message, errorObject) {
    LogMe(1, '* * * * * * ERROR * * * * * *  ' + message);
    if (errorObject!=undefined) { LogMe(1, errorObject.stack); }
    let finalmessage = message;
    if (errorObject!=undefined) { finalmessage = message + '\n' + errorObject.message }

    await AsyncAlert(message, 'Error');
}

export function ErrorAlert(message, errorObject) {
    LogMe(1, '* * * * * * ERROR * * * * * *  ' + message);
    if (errorObject!=undefined) { LogMe(1, errorObject.stack); }
    let finalmessage = message;
    if (errorObject!=undefined) { finalmessage = message + '\n' + errorObject.message }

    Alert.alert(
      'Error',
      finalmessage,
      [
        { text: 'Ok' },
      ],
      { cancelable: false }
    );
}

export function InfoMessage(title, message) {
    LogMe(2, 'INFO provided to the user: ' + title + ': ' + message);
    Alert.alert(
      title,
      message,
      [
        { text: 'Ok' },
      ],
      { cancelable: false }
    );
}

export async function InitialisationActions() {
    LogMe(1, 'InitialisationActions()');

    LogMeUsername = false;

    // Create images dir, if it does not exist
    try {
        await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory + PARAM_IMAGES_DIRNAME);
    }
    // Ignored -- Directory already exists
    // We can't distinguish between 'directory already exists' and other types of errors
    catch(error) { 
    }

    if (PARAM_PP__CRYPTO.null_crypto) {
      LogMe(1, 'Show warning about null_crypto');
      await AsyncAlert('PARAM_PP__CRYPTO.null_crypto is enabled. This means that the private pictures will not be encrypted!', 'WARNING');
    }      
    
}



export async function  EraseLocalData() {
    LogMe(1, 'EraseLocalData()');
    // delete images folder
    try {
        await FileSystem.deleteAsync(FileSystem.documentDirectory + PARAM_IMAGES_DIRNAME, {idempotent: true})  // Because idempotent is set to true, it does not throw error if directory does not exist
        // Also delete key-value pairs from storage
        //await AsyncStorage.clear();
        await storage.clearMap();
        await storage.clearAll();  // Undocumented function but necessary, otherwise old data reappears
        await InitialisationActions();
    }
    catch(error) {
        //console.error(error);
        ErrorAlert(error.message, error);  // Some error
    };    
}


export function IsValidImageExtensionAndContentType (myextension) {
    // We assume that there is an equivalence between image extension and image content-type
    return myextension.match(/^[0-9a-zA-Z]+$/);
}


export async function LoadBaseImageAssetFileB64() {
  // Asset class requires `npx expo install expo-asset'
  // Do not change localUri symbol here
  //const contents1 = await FileSystem.readAsStringAsync('./myGeneralLibrary.jsx', {encoding: 'base64'});
  //LogMe(1,'GetPngBaseImageForWrapping(): Done');

  // WARNING .-
  // Referencing Assets in Image components works fine in all cases.
  // Reading Asset files works just fine with the bare workflow on metro, but it doesn't work with the production build of APK/AAB.
  // Therefore, the code below does not work

  /*
  const myAsset = Asset.fromModule(require('../assets/custom/base_image_for_wrapping.png'));  // the 'require' syntax does not accept variables

  LogMe(1,'GetPngBaseImageForWrapping(): myAsset, before downloadAsync ======'+JSON.stringify(myAsset));
  if (!myAsset.localUri) {
    LogMe(1,'GetPngBaseImageForWrapping(): performing downloadAsync() on myAsset');
    await myAsset.downloadAsync();
  }
  LogMe(1,'GetPngBaseImageForWrapping(): myAsset, after downloadAsync ======'+JSON.stringify(myAsset));

  const contents = await FileSystem.readAsStringAsync(myAsset.localUri, {encoding: 'base64'});
  LogMe(2,'GetPngBaseImageForWrapping(): contents ======'+JSON.stringify(contents));
  return contents;
  */
}

