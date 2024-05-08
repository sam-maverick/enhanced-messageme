import { Buffer } from 'buffer';
import { Alert } from 'react-native';
import Crypto from 'react-native-quick-crypto';
import { PARAM_PP__CHARSET_AUTH, PARAM_LOGGING_LEVEL } from './update-parameters';


function LogUS(level, message) {
  if (level <= PARAM_LOGGING_LEVEL) {
      console.log('(emclient) (update-utils.js) '+message);
  }
}

export function IsValidImageExtensionAndContentType (myextension) {
    // We assume that there is an equivalence between image extension and image content-type
    if (myextension === null || myextension === undefined) {
      return false;
    }
    return myextension.match(/^[0-9a-zA-Z]+$/);
}

export function EncodeFromB64ToBinary (str) {
    LogUS(1,'EncodeFromB64ToBinary() called');
    return Buffer.from(str, 'base64').toString('binary');
}
  
export function EncodeFromBinaryToB64 (str) {
    LogUS(1,'EncodeFromBinaryToB64() called');
    return Buffer.from(str, 'binary').toString('base64');
}
  
export function EncodeFromB64ToUTF8 (str) {
    LogUS(1,'EncodeFromB64ToUTF8() called');
    return Buffer.from(str, 'base64').toString('utf8');
}
  
export function EncodeFromUTF8ToB64 (str) {
    LogUS(1,'EncodeFromUTF8ToB64() called');
    return Buffer.from(str, 'utf8').toString('base64');
}

export const AsyncAlert = async (message) => new Promise((resolve) => {
    Alert.alert(
      'Notice',
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
  
export function GetRandomIntInclusive(min, max) {
    const randomBuffer = new Uint32Array(1);
  
    Crypto.getRandomValues(randomBuffer);
  
    let randomNumber = randomBuffer[0] / (0xffffffff + 1);
  
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(randomNumber * (max - min + 1)) + min;
}
  
export function GenerateRandomString (stringLength) {
    let result = '';
    let counter = 0;
    while (counter < stringLength) {
        result += PARAM_PP__CHARSET_AUTH.charAt(GetRandomIntInclusive(0, PARAM_PP__CHARSET_AUTH.length-1));
        counter += 1;
    }
    return result;         
}
  

