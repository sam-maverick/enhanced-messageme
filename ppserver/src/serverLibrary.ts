import { PARAM_CHARSET_TOKENS, PARAM_LOGGING_LEVEL } from './parameters';

import * as crypto from "crypto";


export function LogMe(level, message) {
    if (level <= PARAM_LOGGING_LEVEL) {
        console.log(message);
    }
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

