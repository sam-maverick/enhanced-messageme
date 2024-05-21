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
export async function RequestToDecryptKey(userAccountData) {
  LogMe(1, 'RequestToDecryptKey() called');
  LogMe(1, 'Requesting token(s) from server');

  // GET NONCE(S)

  let apiresgetnonce1 = undefined;        
  let apiresgetnonce2 = undefined;        
  try {
    if (Platform.OS === 'android') {
      // Note: Android warmup is done from within PPWrapOps.ComponentRefresh()
      apiresgetnonce1 = await ApiGetNonceFromServer(userAccountData.PPEcookie, 'android', 'classic');
      apiresgetnonce2 = await ApiGetNonceFromServer(userAccountData.PPEcookie, 'android', 'standard');
    } else {  // ios
        apiresgetnonce1 = await ApiGetNonceFromServer(userAccountData.PPEcookie, 'ios', 'assertion');
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
  LogMe(1,'cookie:'+userAccountData.PPEcookie);

  let apiressubmitobject = undefined;

  try {
    if (Platform.OS === 'android') {
      apiressubmitobject = await ApiSubmitTwoAttestationTokensToServer(
        'PPWrapOps', 
        userAccountData.PPEcookie, 
        Platform.OS, 
        Platform.Version, 
        'classic', 
        attestationobject1,
        'standard',
        attestationobject2
      );
    } else {  // ios
      apiressubmitobject = await ApiSubmitAttestationTokenToServer(
        'PPWrapOps', 
        userAccountData.PPEcookie, 
        Platform.OS, 
        Platform.Version, 
        'assertion', 
        attestationobject1
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
    ErrorAlert(apiressubmitobject.resultMessage);  // Server-side message
    const msg = 'Attestation has failed. ' + apiressubmitobject.resultMessage;
    LogMe(1, msg);
    return Promise.reject({message: msg});
  } else {
      // Successful
      // Do stuff.............................................
      await AsyncAlert('Attestation successful', 'INFO');
      return Promise.resolve(true);
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


    
    const response = await RequestToDecryptKey(myAccountData);



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
      provider_privkey = '-----BEGIN PRIVATE KEY-----\n\
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\n\
UiXwCV7iGsm8mWNFR0OkLyY=\n\
-----END PRIVATE KEY-----';
      const stage2_key = Crypto.privateDecrypt(
        provider_privkey, 
        EncodeFromB64ToBuffer(ppPpChunkContents.stage3.encrypted_stage2_key_b64)
      );

      //STAGE2
      LogMe(1, 'UnwrapPicture(): STAGE2');
      const cipher2 = Crypto.createDecipheriv(
        ppPpChunkContents.stage2.encryption_algorithm, 
        stage2_key, 
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
