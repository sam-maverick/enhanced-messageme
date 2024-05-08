import * as AppIntegrityAndroidStandard from 'app-integrity-android-standard';

import * as Integrity from 'expo-app-integrity';


// This interface simply maps some function calls to the corresponding library calls


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
