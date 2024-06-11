import * as AppIntegrityAndroidStandard from 'app-integrity-android-standard';

import * as Integrity from 'expo-app-integrity';

import { ErrorAlert, LogMe, UpdateLogMeUsername } from '../myGeneralLibrary.jsx';
import storage from '../storage/storageApi.js';

import { PARAM_GOOGLE_CLOUD_PROJECT_NUMBER, PARAM_IOS_KEY_IDENTIFIER } from '../parameters.js';

import { ApiGetNonceFromServer, ApiSubmitAttestationTokensToServer } from '../network/networkApi.js';

import { Platform } from 'react-native';



// Map some function calls to the corresponding library calls


export async function AndroidStandardWarmup(GoogleCloudProjectNumber) {
  return await AppIntegrityAndroidStandard.DoWarmup(GoogleCloudProjectNumber.toString());
}

export async function AndroidStandardRequest(clientHash, GoogleCloudProjectNumber) {
  return await AppIntegrityAndroidStandard.GetToken(clientHash, GoogleCloudProjectNumber.toString());
}

export async function AndroidClassicRequest(nonce, GoogleCloudProjectNumber) {
  return await Integrity.attestKey(nonce, GoogleCloudProjectNumber);
}

export async function iosKeygen(keyID) {
  return await Integrity.generateKey(keyID);
}

export async function iosAppAttestRequest(keyID, challenge) {
  return await Integrity.attestKey(keyID, challenge);
}

export async function iosAppAssertRequest(keyID, challenge) {
  return await Integrity.generateAssertion(keyID, challenge);
}


// Utilitarian functions


/**
 * Executes attestation warmup. Only applies to Android's standard requests
 * @param {function} setAttestationStatusFunction Callback function to set informational status as string
 * @param {function} setAttestationTestInProgressFunction Callback function to set progress status as boolean; true means 'in progress'
 * @return Promise
 */
export async function DoWarmup(setWarmupStatusFunction, setWarmupInProgressFunction) {
  //console.log('param:'+PARAM_GOOGLE_CLOUD_PROJECT_NUMBER);
  LogMe(1, 'Starting warmup');
  setWarmupInProgressFunction(true);
  setWarmupStatusFunction('Executing...');

  return AndroidStandardWarmup(PARAM_GOOGLE_CLOUD_PROJECT_NUMBER.toString())
  .then( async () => {
      setWarmupStatusFunction('Successful');
      setWarmupInProgressFunction(false);
      LogMe(1, 'Warmup OK');
      return Promise.resolve(true);
  })
  .catch((error) => {
      ErrorAlert("Error from integrity API.\n"+JSON.stringify(error), undefined);  // API error
      setWarmupStatusFunction('ERROR');        
      setWarmupInProgressFunction(false);
      LogMe(1, 'Warmup KO');
      return Promise.resolve(false);
  });

}




/**
* Checks App Attest attestation/assertion in iOS, or Play Integrity (standard/classic) in Android
* @param {string} RequestType For iOS, set to 'attestation' or 'assertion'. For Android, set to 'classic' or 'standard'.
* @param {function} setAttestationStatusFunction Callback function to set informational status ('Executing...', 'ERROR', 'FAILED', 'Success') as string
* @param {function} setAttestationTestInProgressFunction Callback function to set progress status as boolean; true means 'in progress'
* @return Promise
*/
export async function CheckIntegrity(environment, keyIdentifier, someProps, saveMyProps, setAttestationStatusFunction, setAttestationTestInProgressFunction, RequestType, CookieName) {
  //console.log('param:'+PARAM_GOOGLE_CLOUD_PROJECT_NUMBER);
  setAttestationTestInProgressFunction(true);
  setAttestationStatusFunction('Executing...');

  LogMe(1, 'Requesting token from server');
  let apiresgetnonce = undefined;        

  // GET NONCE

  try {
      apiresgetnonce = await ApiGetNonceFromServer(someProps.AccountData[CookieName], Platform.OS, RequestType);
  } catch(error) {
      ErrorAlert('Error when requesting nonce to the PP server.', error);  // Network error
      setAttestationStatusFunction('ERROR');
      setAttestationTestInProgressFunction(false);
      return Promise.resolve(false);
  }

  if (!apiresgetnonce.isSuccessful) {
      ErrorAlert('Error on server side when requesting token: '+apiresgetnonce.resultMessage, undefined);  // Server-side application error
      setAttestationStatusFunction('ERROR'); 
      setAttestationTestInProgressFunction(false);
      return Promise.resolve(false);                   
  }

  LogMe(1, 'Received nonce from server');
  LogMe(2, 'Nonce is: '+apiresgetnonce.nonce);

  // SAVE COOKIE

  LogMe(1,'CookieName='+CookieName);
  LogMe(1,'apiresgetnonce.cookie='+apiresgetnonce.cookie);
  let cloneAccountData = { ...someProps.AccountData};
  cloneAccountData[CookieName] = apiresgetnonce.cookie;
  // We store cookie only if attestation was successful
  // In practice, the cookie is only useful in iOS assertions
  try {
      const storagenewdata = {
          key: 'accountData', // Note: Do not use underscore("_") in key!
          data: cloneAccountData,
      };
      await storage.save(storagenewdata);
      LogMe(1,'Saved to storage: '+JSON.stringify(storagenewdata));
      await saveMyProps({AccountData: cloneAccountData});

  } catch(error) { 
      ErrorAlert(error.message, error);  // Storage error
      setAttestationStatusFunction('ERROR');        
      setAttestationTestInProgressFunction(false);
      LogMe(1, 'Attestation unsuccessful due to storage issue.');
      return Promise.resolve(false);
  }                        


  // GET TOKEN FROM ATTESTATION API

  let resultingpromise = undefined;
  try {
      // Don't do "resultingpromise = await function_name(..." here because the "then" already handles the "await"
      if (Platform.OS === 'android' && RequestType === 'classic') {
          resultingpromise = AndroidClassicRequest(apiresgetnonce.nonce, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER);
      } else if (Platform.OS === 'android' && RequestType === 'standard') {
          resultingpromise = AndroidStandardRequest(apiresgetnonce.nonce, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER.toString());
      } else if (Platform.OS === 'ios' && RequestType === 'attestation') {
          resultingpromise = iosAppAttestRequest(keyIdentifier, apiresgetnonce.nonce);
      } else if (Platform.OS === 'ios' && RequestType === 'assertion') {
          resultingpromise = iosAppAssertRequest(keyIdentifier, apiresgetnonce.nonce);
      } else {
          ErrorAlert('Error: RequestType must be either \'classic\' or \'standard\' for \'android\' platforms, or \'attestation\' or \'assertion\' for \'ios\' platforms. We found '+RequestType+'.', undefined);
          setAttestationStatusFunction('ERROR');       
          setAttestationTestInProgressFunction(false);
          return Promise.resolve(false);
      }
      return resultingpromise
      .then(async (attestationTokenObject) => {
          LogMe(1, 'Received attestation token from library API layer');
          LogMe(2, 'Token is: '+JSON.stringify(attestationTokenObject));
          //console.log(JSON.stringify(attestationTokenObject));
          return ApiSubmitAttestationTokensToServer(environment, apiresgetnonce.cookie, Platform.OS, Platform.Version, [{requestType: RequestType, token: attestationTokenObject}], undefined)
          .then(async (apiressubmitobject) => {

              if ( ! apiressubmitobject.isSuccessful) {
                  ErrorAlert(apiressubmitobject.resultMessage);  // Server-side message
                  setAttestationStatusFunction('FAILED');
                  setAttestationTestInProgressFunction(false);
                  return Promise.resolve(false);
              } else {
                  // Successful
                  setAttestationStatusFunction(apiressubmitobject.resultMessage);
                  setAttestationTestInProgressFunction(false);
                  return Promise.resolve(true);
              }

          })
          .catch((error) => {
              ErrorAlert('Error when submitting attestation object to the PP server.', error);  // Network error
              setAttestationStatusFunction('ERROR');       
              setAttestationTestInProgressFunction(false);
              return Promise.resolve(false);
          });    
      })
      .catch((error) => {
          ErrorAlert("Error from integrity API.\n"+JSON.stringify(error), undefined);  // API error
          setAttestationStatusFunction('ERROR');        
          setAttestationTestInProgressFunction(false);
          return Promise.resolve(false);
      });
  } catch (error) {
      ErrorAlert("Exception from integrity API.\n"+JSON.stringify(error), undefined);  // API error
      setAttestationStatusFunction('ERROR');        
      setAttestationTestInProgressFunction(false);
      return Promise.resolve(false);
  }

}


/**
* Generates and stores a new keypair. Only applies to iOS
* @param {function} setKeygenStatusFunction Callback function to set informational status as string
* @param {function} setKeygenInProgressFunction Callback function to set progress status as boolean; true means 'in progress'
* @return Promise
*/
export async function DoKeygen(setKeygenStatusFunction, setKeygenInProgressFunction, keypairName) {
  LogMe(1, 'Starting key-pair generation');
  setKeygenInProgressFunction(true);
  setKeygenStatusFunction('Executing...');

  return iosKeygen(keypairName)
  .then( async () => {

      setKeygenStatusFunction('Successful');
      setKeygenInProgressFunction(false);
      LogMe(1, 'Key-pair generation OK');
      return Promise.resolve(true);

  })
  .catch((error) => {
      ErrorAlert("Error from integrity API.\n"+JSON.stringify(error), undefined);  // API error
      setKeygenStatusFunction('ERROR');        
      setKeygenInProgressFunction(false);
      LogMe(1, 'Key-pair generation KO');
      return Promise.resolve(false);
  });

}
