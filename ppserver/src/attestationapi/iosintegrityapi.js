import { LogMe } from '../serverLibrary';
import { PARAM_LOGGING_LEVEL, IOS_BUNDLE_ID, IOS_TEAM_ID, IOS_IS_DEVELOPMENT_ENVIRONMENT, IOS_SUPPORTED_VERSIONS } from '../parameters';

import { verifyAttestation, verifyAssertion } from 'appattest-checker-node';




/**
 * iOS check Endpoint.
 * 'token' is the token the client received from the Apple Server in the previous step
 * 'nonce_truth' is the ground truth of the nonce as stored by the app server
 * 'keyId' is the hash of the public key of the keypair generated previously by the client
 */
export async function CheckAppAttestation(token, nonce_truth, keyId) {

        LogMe(1, 'Called CheckAppAttestation');
        LogMe(2, '  Token is: '+JSON.stringify(token));
        LogMe(2, '  Nonce_truth: '+nonce_truth);
        LogMe(2, '  KeyId: '+keyId);

        try {

                const result = await verifyAttestation(
                    {
                      appId: IOS_TEAM_ID + '.' + IOS_BUNDLE_ID,
                      developmentEnv: IOS_IS_DEVELOPMENT_ENVIRONMENT,
                    },  // appInfo
                    keyId,
                    nonce_truth,
                    token
                );

                if ('verifyError' in result) {
                    // Return error to app.
                    // It should not use the generated keys for assertion.
                    LogMe(1, 'iOS attestation failed: '+result.errorMessage);
                    return {status: 'fail', message: result.errorMessage, publicKeyPem: '', receipt: ''};
                } else {

                    // Note: Attestations do not contain security metrics
                    // https://developer.apple.com/documentation/devicecheck/assessing-fraud-risk
                
                    // Return success to app.
                    // It can use the generated keys for request assertion.
                    LogMe(1, 'iOS attestation succeeded.');
                    LogMe(2, 'Public key: '+result.publicKeyPem);
                    return {
                        status: 'success', 
                        message: 'Attestation warmup successful.', 
                        publicKeyPem: result.publicKeyPem,
                        receipt: result.receipt,
                    };
                }                  

        } catch(e)  {
            LogMe(1, e);
            if (PARAM_LOGGING_LEVEL>=2) {
                return {status: 'error', message: e.message, publicKeyPem: '', receipt: ''};
            } else {
                return {status: 'error', message: 'An exception has occurred when processing the attestation of the token. Check server logs.', publicKeyPem: '', receipt: ''};
            }
        }

}




/**
 * iOS check Endpoint.
 * 'token' is the token the client received from the Apple Server in the previous step
 * 'nonce_truth' is the ground truth of the nonce as stored by the app server
 */
export async function CheckAppAssertion(token, nonce_truth, iosPublicKeyPem, iosSignCount) {

    LogMe(1, 'Called CheckAppAssertion');
    LogMe(2, '  Token is: '+JSON.stringify(token));
    LogMe(2, '  Nonce_truth: '+nonce_truth);
    LogMe(2, '  record: '+JSON.stringify(record));

    try {

        // Check that challenge in request matches challenge issued by server

        const result = await verifyAssertion(
            nonce_truth,
            iosPublicKeyPem,
            IOS_TEAM_ID + '.' + IOS_BUNDLE_ID,
            token
        );
        if ('verifyError' in result) {
            // Request cannot be trusted!
            // Fail request from app (e.g. return HTTP 401 equivalent)
            LogMe(1, 'iOS assertion failed: '+result.verifyError);
            return {status: 'fail', message: result.verifyError, iosSignCount: undefined};
        }

        // Check that signCount >= persisted value.
        if (result.signCount < iosSignCount) {
            // Request cannot be trusted!
            // Fail request from app (e.g. return HTTP 401 equivalent)
            LogMe(1, 'iOS signCount check failed: '+'Inconsistency; signCount is below its last seen value');
            return {status: 'fail', message: 'Inconsistency; signCount is below the last seen value', iosSignCount: undefined};
        // Check that signCount <= persisted value + MAX_ALLOWED_IOS_SIGNCOUNT_GAP
        } else if ((result.signCount - iosSignCount) > process.env.MAX_ALLOWED_IOS_SIGNCOUNT_GAP) {
            // Request cannot be trusted!
            // Fail request from app (e.g. return HTTP 401 equivalent)
            LogMe(1, 'iOS signCount check failed: '+'Security issue; signCount exceeds the last seen value by too far, which might indicate an attack');
            return {status: 'fail', message: 'Security issue; signCount exceeds the last seen value by too far', iosSignCount: undefined};
        } else {
            // Otherwise request can be trusted and continue processing as usual.
            return {status: 'success', message: 'Assertion successful.', iosSignCount: result.signCount};
        }

    } catch(e)  {
        LogMe(1, e);
        if (PARAM_LOGGING_LEVEL>=2) {
            return {status: 'error', message: e.message, iosSignCount: undefined};
        } else {
            return {status: 'error', message: 'An exception has occurred when processing the assertion of the token. Check server logs.', iosSignCount: undefined};
        }
    }

}