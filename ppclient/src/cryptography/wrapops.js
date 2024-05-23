import { Platform } from 'react-native';

import Crypto from 'react-native-quick-crypto';

var png = require('png-metadata');

import { 
    EncodeFromB64ToBuffer, 
    EncodeFromBufferToB64, 
    EncodeFromB64ToBinary, 
    EncodeFromBinaryToB64, 
    EncodeFromB64ToUTF8,
    EncodeFromUTF8ToB64,
    ErrorAlert, 
    ErrorAlertAsync, 
    AsyncAlert, 
    LogMe, 
 } from '../myGeneralLibrary.jsx';

import {
  PARAM_PP__CRYPTO,
  PARAM_IOS_KEY_IDENTIFIER,
  PARAM_GOOGLE_CLOUD_PROJECT_NUMBER,
} from '../parameters.js';

import { ApiGetNonceFromServer, ApiSubmitAttestationTokenToServer, ApiSubmitTwoAttestationTokensToServer } from '../network/networkApi.js';

import * as AppIntegrity from '../integrity/integrityapis.js';




// We assume that Platform.OS has already been checked to be compatible
export async function RequestToDecryptKey(myPPEcookie, encryptedKeyB64) {
  LogMe(1, 'RequestToDecryptKey() called');
  LogMe(1, 'encryptedKeyB64:'+encryptedKeyB64);
  LogMe(1, 'Requesting token(s) from server');

  // GET NONCE(S)

  let apiresgetnonce1 = undefined;        
  let apiresgetnonce2 = undefined;        
  try {
    if (Platform.OS === 'android') {

      LogMe(1, 'Doing Android warmup');
      await AppIntegrity.DoWarmup(function () {}, function () {});
      LogMe(1, 'Done doing Android warmup');
      
      apiresgetnonce1 = await ApiGetNonceFromServer(myPPEcookie, 'android', 'classic');
      apiresgetnonce2 = await ApiGetNonceFromServer(myPPEcookie, 'android', 'standard');
    } else {  // ios
        apiresgetnonce1 = await ApiGetNonceFromServer(myPPEcookie, 'ios', 'assertion');
    }
  } catch(error) {
      const msg = 'Error when requesting nonce to the PP server. ';
      LogMe(1, msg + error.stack);  // Network error
      return Promise.reject({message: msg + error.message});
  }

  LogMe(1, 'Checking for server-side application errors');
  // Check for server-side application errors
  if (Platform.OS === 'android') {
    if ( ! apiresgetnonce1.isSuccessful) {
      const msg = 'Application error when requesting android-classic nonce to the PP server. ';
      LogMe(1, msg + apiresgetnonce1.resultMessage);
      return Promise.reject({message: msg + apiresgetnonce1.resultMessage});
    }
    if ( ! apiresgetnonce2.isSuccessful) {
      const msg = 'Application error when requesting android-standard nonce to the PP server. ';
      LogMe(1, msg + apiresgetnonce2.resultMessage);
      return Promise.reject({message: msg + apiresgetnonce2.resultMessage});
    }
  } else {  // ios
    if ( ! apiresgetnonce1.isSuccessful) {
      const msg = 'Application error when requesting ios-assertion nonce to the PP server. ';
      LogMe(1,  + apiresgetnonce1.resultMessage);
      return Promise.reject({message: msg + apiresgetnonce1.resultMessage});
    }
  }

  LogMe(1, 'Creating attestation token object(s)');
                   
  // GET TOKEN(S) FROM ATTESTATION API

  let attestationobject1 = undefined;
  let attestationobject2 = undefined;

  if (Platform.OS === 'android') {
    try {
      attestationobject1 = await AppIntegrity.AndroidClassicRequest(apiresgetnonce1.nonce, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER);
    } catch(error) {
      return Promise.reject({message: 'Coult not prepare Android Classic attestation object. Error from AppIntegrity API.\n'+JSON.stringify(error)});
    }
    try {
      attestationobject2 = await AppIntegrity.AndroidStandardRequest(apiresgetnonce2.nonce, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER.toString());
    } catch(error) {
      return Promise.reject({message: 'Coult not prepare Android Standard attestation object. Error from AppIntegrity API.\n'+JSON.stringify(error)});
    }  
  } else {  // ios
    // We skip attestation because we can assume it has been done, as the device needs to achieve enrollment to reach this point
    try {
      attestationobject1 = await AppIntegrity.iosAppAssertRequest(PARAM_IOS_KEY_IDENTIFIER.PPEnrollment, apiresgetnonce1.nonce);
    } catch(error) {
      return Promise.reject({message: 'Coult not prepare iOS assertion object. Error from AppIntegrity API.\n'+JSON.stringify(error)});
    }          
  }

  // SUBMIT TOKEN(S) TO OUR PP SERVER

  LogMe(1, 'Submitting token(s) to PP server');
  LogMe(1,'cookie:'+myPPEcookie);

  let apiressubmitobject = undefined;

  try {
    if (Platform.OS === 'android') {
      apiressubmitobject = await ApiSubmitTwoAttestationTokensToServer(
        'PPWrapOps', 
        myPPEcookie, 
        Platform.OS, 
        Platform.Version, 
        'classic', 
        attestationobject1,
        'standard',
        attestationobject2,
        encryptedKeyB64
      );
    } else {  // ios
      apiressubmitobject = await ApiSubmitAttestationTokenToServer(
        'PPWrapOps', 
        myPPEcookie, 
        Platform.OS, 
        Platform.Version, 
        'assertion', 
        attestationobject1,
        encryptedKeyB64
      );
    }
  } catch(error) {  // Network error
    const msg = 'Error when submitting attestation token to the PP server. ';
    LogMe(1, msg + error.stack);
    return Promise.reject({message: msg+error.message});
  }          

  // CHECK RESULT GIVEN BY THE PP SERVER

  LogMe(1, 'Checking response from PP server');

  if ( ! apiressubmitobject.isSuccessful) {
    // Failed by application (attestation rejected)
    const msg = 'Attestation has failed. Check that your device is not rooted/jailbroken, that you have all security rotections enabled, and that you downloaded the app from the official store. Then try again.\nServer message: ' + apiressubmitobject.resultMessage;
    LogMe(1, msg);
    return Promise.reject({message: msg});
  } else {
      // Successful
      return Promise.resolve(apiressubmitobject.decryptedKey);
  }

}



// wrappedPicture is an enveloppe containing a private picture, in base64 formatted String
// It returns an object
// In case of error/failure, it throws an Error. It is up to the calling code to catch it.
export async function UnwrapPicture (wrappedPictureObject, myAccountData) {
  LogMe(1, 'UnwrapPicture() called');

  // Unwrap (steganographically)

  let ppPpChunkFound = false;
  let ppPpChunkContents = {};

  LogMe(1, 'UnwrapPicture(): Unpackaging metadata');
  let s = EncodeFromB64ToBinary(wrappedPictureObject);

  LogMe(1, 'Parsing PNG metadata');
  let list = png.splitChunk(s);
  LogMe(2, 'Metadata contents:'+JSON.stringify(list))

  await list.forEach(function (arrayItem) {
      if (arrayItem?.type === 'ppPp' && arrayItem?.data) {
          LogMe(1, 'Found ppPp chunk with data');
          ppPpChunkFound = true;
          ppPpChunkContents = JSON.parse(arrayItem.data);
      }
  });
  
  if (!ppPpChunkFound) {
    throw new Error('ppPp chunk was not found or it did not contain data');
  } else {

    // Unwrap cryptographically

    // We assume that the device is already enrolled (it must be checked and it is checked by PPWrapOps.jsx)
    // In any case, in practice, server response will give a FAIL if not enrolled

    /// BEGIN

    let returnObject = {};

    if (ppPpChunkContents.null_crypto) {
      returnObject = {
        contentType: ppPpChunkContents.contentType,
        data: ppPpChunkContents.data,
      };
    } else {
      // STAGE3
      LogMe(1, 'UnwrapPicture(): STAGE3');           

      const stage2_key_B64 = await RequestToDecryptKey(myAccountData.PPEcookie, ppPpChunkContents.stage3.encrypted_stage2_key_b64);

      LogMe(2, 'Decrypted key from server: '+stage2_key_B64);

      //STAGE2
      LogMe(1, 'UnwrapPicture(): STAGE2');
      const cipher2 = Crypto.createDecipheriv(
        ppPpChunkContents.stage2.encryption_algorithm, 
        EncodeFromB64ToBuffer(stage2_key_B64), 
        EncodeFromB64ToBuffer(ppPpChunkContents.stage2.iv_b64)
      );
      await cipher2.write(EncodeFromB64ToBuffer(ppPpChunkContents.stage1.ciphertext));
      await cipher2.end();
      const decrypted_stage1 = JSON.parse(await cipher2.read());
      // Here we get the privacy parameters

      //STAGE1
      LogMe(1, 'UnwrapPicture(): STAGE1');
      /*
      // Since the key is not a human password but random bits, we do not need to pbkdfify
      const pbkdf_algorithm = EncodeFromB64ToBinary(ppPpChunkContents.stage1.pbkdf_algorithm).toString();
      const pbkdf_iterations = Number(EncodeFromB64ToBinary(ppPpChunkContents.stage1.pbkdf_iterations));
      const password = ...
      const salt = ...
      const key = Crypto.pbkdf2Sync(password, salt, pbkdf_iterations, 32, pbkdf_algorithm);
      */
      const cipher1 = Crypto.createDecipheriv(
        decrypted_stage1.encryption_algorithm, 
        EncodeFromB64ToBuffer(decrypted_stage1.key_b64), 
        EncodeFromB64ToBuffer(decrypted_stage1.iv_b64)
      );
      await cipher1.write(EncodeFromB64ToBuffer(ppPpChunkContents.ciphertext));
      await cipher1.end();
      const decrypted_picture = await cipher1.read();

      // Return the results
      returnObject = {
        'contentType': ppPpChunkContents.contentType,
        'data': decrypted_picture,
      };
    }

    /// END
    LogMe(1, 'UnwrapPicture(): Finished');
    return returnObject;
  }
}






// plainPicture is a picture content in base64 formatted String
// It returns a base64 formatted String
export async function WrapPicture (plainPicture, fileExt) {
    LogMe(1, 'WrapPicture() called');

    // Wrap cryptographically

    /// BEGIN

    let ppPlainPictureObjectStr = '';

    if (PARAM_PP__CRYPTO.null_crypto) {
      ppPlainPictureObjectStr = JSON.stringify({
        'null_crypto': true,
        'data': plainPicture, 
        'contentType': fileExt,
      });  
    } else {
      // STAGE1
      LogMe(1, 'WrapPicture(): STAGE1');
      /*
      // Since the key is not a human password but random bits, we do not need to pbkdfify
      const pbkdf_algorithm = PARAM_PP__CRYPTO.stage1.pbkdf_algorithm;
      const pbkdf_iterations = PARAM_PP__CRYPTO.stage1.pbkdf_iterations;
      const password = Crypto.randomBytes(32);
      const salt = Crypto.randomBytes(16);
      const key = Crypto.pbkdf2Sync(password, salt, pbkdf_iterations, 32, pbkdf_algorithm);
      */
      const stage1_key = Crypto.randomBytes(32);
      const stage1_iv = Crypto.randomBytes(16);
      const cipher1 = Crypto.createCipheriv(PARAM_PP__CRYPTO.stage1.encryption_algorithm, stage1_key, stage1_iv);
      await cipher1.write(plainPicture);
      await cipher1.end();
      const ciphertext_picture = await cipher1.read();

      // STAGE2
      LogMe(1, 'WrapPicture(): STAGE2');
      const stage2_key = Crypto.randomBytes(32);
      const stage2_iv = Crypto.randomBytes(16);
      const cipher2 = Crypto.createCipheriv(PARAM_PP__CRYPTO.stage2.encryption_algorithm, stage2_key, stage2_iv);
      await cipher2.write(JSON.stringify({
        encryption_algorithm: PARAM_PP__CRYPTO.stage1.encryption_algorithm,
        iv_b64: EncodeFromBufferToB64(stage1_iv),
        key_b64: EncodeFromBufferToB64(stage1_key),
      }));  // stage1 data
      await cipher2.end();
      const ciphertext_stage1 = await cipher2.read();

      // STAGE3
      LogMe(1, 'WrapPicture(): STAGE3');
      const provider_pubkey = EncodeFromB64ToBinary(require('../../bundled_files/json/rsa-pubkey-wrapping-ppclient.pem.json').data);

      const encrypted_stage2_key = Crypto.publicEncrypt(
        Buffer.from(provider_pubkey), 
        stage2_key
      );

      // Pack contents

      LogMe(1, 'WrapPicture(): Creating metadata object');
      ppPlainPictureObjectStr = JSON.stringify({
        null_crypto: false,
        stage1: {
          ciphertext: EncodeFromBufferToB64(ciphertext_stage1),
        },
        stage2: {
          encryption_algorithm: PARAM_PP__CRYPTO.stage2.encryption_algorithm,
          iv_b64: EncodeFromBufferToB64(stage2_iv),
          // privacy parameters will go here
        }, 
        stage3: {
          provider: 'someprovider',
          encryption_algorithm: PARAM_PP__CRYPTO.stage3.encryption_algorithm,
          encrypted_stage2_key_b64: EncodeFromBufferToB64(encrypted_stage2_key),
        }, 
        ciphertext: EncodeFromBufferToB64(ciphertext_picture), 
        contentType: fileExt,
      });  
    }

    /// END

    // Wrap inside a picture (steganographically)

    // WARNING .-
    // Referencing Assets in Image components works fine in all cases.
    // Reading Asset files works just fine with the bare workflow on metro, but it doesn't work with the production build of APK/AAB.
    // Therefore, the code below does not work
    //var sb64 = await FileSystem.readAsStringAsync(require('../../assets/custom/base_image_for_wrapping.png'), {encoding: 'base64'});
    //var s = EncodeFromB64ToBinary(await LoadBaseImageAssetFileB64());

    LogMe(1, 'WrapPicture(): Packaging metadata');
    const s = EncodeFromB64ToBinary(require('../../bundled_files/json/base_image_for_wrapping.png.json').data);

    // split
    var list = png.splitChunk(s);
    // append
    var iend = list.pop(); // remove IEND

    var newchunk1 = png.createChunk("ppPp", ppPlainPictureObjectStr);
    //https://en.wikipedia.org/wiki/PNG
    list.push(newchunk1);

    // Not necessary:
    //var newchunk2 = png.createChunk("ppPt", "Wrapped private picture");
    //https://en.wikipedia.org/wiki/PNG
    //list.push(newchunk2);

    list.push(iend);
    // join
    var newpng = png.joinChunk(list);
    // save to file
    //fs.writeFileSync(outfile, newpng, 'binary');
    LogMe(1, 'WrapPicture(): Finished');
    return EncodeFromBinaryToB64(newpng);
    
}
