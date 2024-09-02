// Do not import custom libraries from here

import * as SecureStorage from 'expo-secure-store';
import { LogMe } from '../myGeneralLibrary.jsx';

/**
 * Key: The key to associate with the stored value. Keys may contain alphanumeric characters, ., -, and _.
 * Value: The value to store. Size limit is 2048 bytes.
 * Options: See https://docs.expo.dev/versions/latest/sdk/securestore/#securestoreoptions
 */

/**
 * 
 * @param {Object} params An object containing key and options. Key is a string, and options is an object
 * @returns Promise with the object value
 */
export async function load (params) {
    LogMe(1, 'StorageApi.js: load: '+params.key);  
    const data = await SecureStorage.getItemAsync(params.key, params.options);
    let retval;
    if (data == '') {
        retval = {};
    } else {
        retval = JSON.parse(data);
    }
    LogMe(1, 'StorageApi.js: save finished');
    return retval;
}

/**
 * 
 * @param {Object} params An object containing key, value and options. Key is a string, value is an object, and options is an object
 * @returns Promise that resolves if successful
 */
export async function save (params) {
    LogMe(1, 'StorageApi.js: save: ' + params.key);  
    const retval = await SecureStorage.setItemAsync(params.key, JSON.stringify(params.value), params.options);
    LogMe(1, 'StorageApi.js: save finished');
    return retval;
}

/**
 * 
 * Deletes a key, if it exists. Rejects Promise if the key exists but cannot be deleted, or if the API
 * gives some error
 * @param {Object} params An object containing key and options. Key is a string, and options is an object
 * @returns Object
 */
export async function deleteKey (params) {
    LogMe(1, 'StorageApi.js: deleteKey: '+params.key);  
    const value = await SecureStorage.getItemAsync(params.key, params.options);
    if (value !== null) {
        const retval = await SecureStorage.deleteItemAsync(params.key, params.options);
        LogMe(1, 'StorageApi.js: deleteKey finished');
        return retval;
    }
}


/*
// See: https://github.com/sunnylqm/react-native-storage

import Storage from 'react-native-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const storage = new Storage({
    // maximum capacity, default 1000 key-ids
    size: 10000,

    // Use AsyncStorage for RN apps, or window.localStorage for web apps.
    // If storageBackend is not set, data will be lost after reload.
    storageBackend: AsyncStorage, // for web: window.localStorage

    // expire time, default: 1 day (1000 * 3600 * 24 milliseconds).
    // can be null, which means never expire.
    defaultExpires: null,

    // cache data in the memory. default is true.
    enableCache: true,

    // if data was not found in storage or expired data was found,
    // the corresponding sync method will be invoked returning
    // the latest data.

    sync: {
    // we'll talk about the details later.
    }
  
  
});

export default storage;

        // Delete key-value pairs from storage
        //await AsyncStorage.clear();
        await storage.clearMap();
        await storage.clearAll();  // Undocumented function but necessary, otherwise old data reappears
*/