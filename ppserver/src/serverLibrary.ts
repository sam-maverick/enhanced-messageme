import { PARAM_CHARSET_TOKENS, PARAM_LOGGING_LEVEL } from './parameters';

import * as crypto from "crypto";


export function LogMe(level: number, message: string) {
    if (level <= PARAM_LOGGING_LEVEL) {
        console.log(message);
    }
}


export function EncodeFromB64ToBuffer (str: string) {
    LogMe(1,'EncodeFromB64ToBuffer() called');
    return Buffer.from(str, 'base64');  // Returns a Buffer
}
  
export function EncodeFromBufferToB64 (buff: Buffer) {
    LogMe(1,'EncodeFromBufferToB64() called');
    return buff.toString('base64');  // Returns a String
}


export function GetRandomIntInclusive(min: number, max:number) {
    const randomBuffer = new Uint32Array(1);

    crypto.getRandomValues(randomBuffer);

    let randomNumber = randomBuffer[0] / (0xffffffff + 1);

    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(randomNumber * (max - min + 1)) + min;
}


export function GenerateRandomString (stringLength: number) {
    let result = '';
    let counter = 0;
    while (counter < stringLength) {
        result += PARAM_CHARSET_TOKENS.charAt(GetRandomIntInclusive(0, PARAM_CHARSET_TOKENS.length-1));
        counter += 1;
    }
    return result;          
}


export function isAnInteger(value) {
    return /^\d+$/.test(value);
  }

