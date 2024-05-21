
//import Crypto from 'react-native-quick-crypto';
const Crypto = require('crypto');
const fs = require('fs')

import { EncodeFromB64ToBuffer, EncodeFromBufferToB64, LogMe } from '../serverLibrary';


// our cwd is the dist folder!
const PPserverPrivateKey = fs.readFileSync(require.resolve('../../secrets/rsa-privkey.pem')).toString();
console.log('Private key loaded');




export async function decryptKey (encryptedKeyB64) {
  LogMe(1, 'decryptKey() called');

  // STAGE3

  const stage2_key = Crypto.privateDecrypt(
    PPserverPrivateKey, 
    EncodeFromB64ToBuffer(encryptedKeyB64)
  );
  return EncodeFromBufferToB64(stage2_key);

}




