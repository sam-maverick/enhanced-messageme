import { Controller, Post, Req } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';


import { AppService } from '../app.service';
import DevicesModel from '../middleware/database/schemas/Device';
import { PARAM_LENGTH_TOKENS, MINIMUM_ANDROID_API_LEVEL, ANDROID_CHECK_MODE, 
    PARAM_IOS_KEY_IDENTIFIER, IOS_SUPPORTED_VERSIONS, IOS_IS_DEVELOPMENT_ENVIRONMENT, MAX_TOTAL_DELAY_MS } from '../parameters';
import { LogMe, GenerateRandomString, isAnInteger } from '../serverLibrary';

import { CheckPlayIntegrity } from '../attestationapi/androidintegrityapi';
import { CheckAppAttestation, CheckAppAssertion } from '../attestationapi/iosintegrityapi';



function CheckIosVersion(platformVersion: string) {
    const semver = require('semver');
    if ( ! semver.satisfies(platformVersion, IOS_SUPPORTED_VERSIONS)) {
        return {status: "fail", message: "Your device does not have the minimum version or patch level for the operating system. Please update your iOS version."};
    } else {  // Successful
        return {status: "success", message: "Attestation successful."};
    }
}



function checkRequestPlatformAndType (platformType: string, requestType: string) {
    if ( !
        (
        (platformType === 'android')
        ||
        (platformType === 'ios')
        )
       ) {
        return {
            result: false,
            message: 'Your platformType is not supported. Only \'android\' and \'ios\' platforms are supported.',
        };
    } else if ( platformType === 'android' && 
                    (
                        requestType !== 'classic'
                        &&
                        requestType !== 'standard'
                    )
              ) {
        return {
            result: false,
            message: 'In Android, only \'standard\' and \'classic\' are supported as requestType.',
        };
    } else if ( platformType === 'ios' && 
                    (
                        requestType !== 'attestation'
                        &&
                        requestType !== 'assertion'
                    )
              ) {
        return {
            result: false,
            message: 'In iOS, only \'attestation\' and \'assertion\' are supported as requestType.',
        };
    } else {
        return {
            result: true,
            message: '',
        };
    }
}


@Controller('attestations')
export class AttestationController {
  constructor(private readonly appService: AppService) {}



  @Post('/submitAttestationTokenToServer')
  async submitAttestationTokenToServer(@Req() req) {

    // DANGER ZONE
    /*
    return {
        isSuccessful: true,
        resultMessage: 'Attestation successful',
      };
    */

    LogMe(1, 'Controller: attestations/submitAttestationTokenToServer');

    LogMe(2, 'Request contents:');
    LogMe(2, '  cookie: '+req.body.cookie);
    LogMe(2, '  platformVersion: '+req.body.platformVersion);
    LogMe(2, '  platformType: '+req.body.platformType);
    LogMe(2, '  requestType: '+req.body.requestType);  // Only relevant if platform is android
    LogMe(2, '  token: '+req.body.token);
    LogMe(2, '  environment: '+req.body.environment);

    // Perform all checks

    const deviceObject = await DevicesModel.findOne({'cookie': req.body?.cookie});

    // Check environment parameter
    if( ! (req.body?.environment === 'PPIntegrity' || req.body?.environment === 'PPEnrollment')) {
        return {isSuccessful: false, resultMessage: 'Environment must be PPIntegrity or PPEnrollment.'};
    }

    // Check if cookie is found
    if( ! deviceObject) {
        return {isSuccessful: false, resultMessage: 'Cookie not found.'};
    }

    const resultVerifyRequest = checkRequestPlatformAndType(req.body.platformType, req.body.requestType);
    if ( ! resultVerifyRequest.result) {
        return {isSuccessful: false, resultMessage: resultVerifyRequest.message};
    }

    // Cross-consistency check, and existence of nonce check
    if ( deviceObject.nonces[req.body.platformType+'_'+req.body.requestType].nonce === '' ) {
        return {isSuccessful: false, resultMessage: 'platformType or requestType inconsistency. You are submitting a token for which a nonce was not generated.'};
    }

    // Single-consumption check for the nonce
    if ( deviceObject.nonces[req.body.platformType+'_'+req.body.requestType].consumed === true ) {
        return {isSuccessful: false, resultMessage: 'This nonce has already been consumed.'};
    }


    // ANDROID ----------------------------------------------------------------------------------------------

    if (req.body.platformType === 'android') {

        let myAndroidCheckMode = ANDROID_CHECK_MODE;
        if (req.body.requestType === 'standard') {
            myAndroidCheckMode = 'google';  // In standard requests, only 'google' mode is supported by Google. Local on-server verification of tokens is not supported in the official API.
        }

        let resultOperation = await CheckPlayIntegrity(
            req.body.token, 
            deviceObject.nonces[req.body.platformType+'_'+req.body.requestType].nonce, 
            myAndroidCheckMode, 
            req.body.requestType);

        LogMe(2, 'Result of the operation: '+JSON.stringify(resultOperation));

        // Check attestation
        if (resultOperation.status !== 'success') {
            return {isSuccessful: false, resultMessage: resultOperation.message};
        }

        if (resultOperation.status === 'success') {
            // Check things after attestation. These things are not attested directly but indirectly.
            // Check version
            if( ! req.body.platformVersion) {  // Field present?
                return {isSuccessful: false, resultMessage: "Missing platformVersion field in the request object."};
            } else if( ! ((typeof req.body.platformVersion) === 'number')) {  // Is of number type?
                return {isSuccessful: false, resultMessage: "Wrong type for platformVersion. We expected number. We found "+(typeof req.body.platformVersion)+"."};
            } else if (req.body.platformVersion < MINIMUM_ANDROID_API_LEVEL) {
                return {isSuccessful: false, resultMessage: "OS version is unsupported. Expected >= " + MINIMUM_ANDROID_API_LEVEL + ". Found " + req.body.platformVersion + "."};
            }
            // Check maximum delay
            if (Date.now() - deviceObject.nonces[req.body.platformType + '_' + req.body.requestType].timestamp > MAX_TOTAL_DELAY_MS[req.body.platformType + '_' + req.body.requestType]) {
                return {isSuccessful: false, resultMessage: "Request too old. Took too long from generating the nonce on our server to checking it on our server."};
            }
            // Note: We do not attest device type (tablet, phone, ...)
        }



    // iOS ----------------------------------------------------------------------------------------------

    } else if (req.body.platformType === 'ios') {

        if (req.body.requestType === 'attestation') {

            let resultOperation = await CheckAppAttestation(
                req.body.token, 
                deviceObject.nonces[req.body.platformType+'_'+req.body.requestType].nonce, 
                PARAM_IOS_KEY_IDENTIFIER[req.body.environment]);

            LogMe(2, 'Result of the operation: '+JSON.stringify(resultOperation));

            // Check attestation
            if (resultOperation.status !== 'success') {
                return {isSuccessful: false, resultMessage: resultOperation.message};
            }

            // Check things after attestation. These things are not attested directly but indirectly.

            // Check version
            let versionCheckResult = CheckIosVersion(req.body?.platformVersion);
            if (versionCheckResult.status !== 'success') {
                return {isSuccessful: false, resultMessage: versionCheckResult.message};
            }

            // Check maximum delay
            if (Date.now() - deviceObject.nonces[req.body.platformType + '_' + req.body.requestType].timestamp > MAX_TOTAL_DELAY_MS[req.body.platformType + '_' + req.body.requestType]) {
                return {isSuccessful: false, resultMessage: "Request too old. Took too long from generating the nonce on our server to checking it on our server."};
            }

            // Note: We do not attest device type (iPad, iPhone, Mac, ...)
            // Looks like Macs are not supported anyway. See: https://developer.apple.com/forums/thread/682488

            // Save publicKey and receipt for this device (sample code).
            const updateResult = await DevicesModel.updateOne(
                {cookie: req.body.cookie},
                {
                    iosPublicKeyPEM: resultOperation.publicKeyPem, 
                    iosReceipt: resultOperation.receipt, 
                    iosSignCount: 0,
                }
            );

            if ( ! updateResult) {
                return {isSuccessful: false, resultMessage: "DB error when updating your request."};
            }



        } else if (req.body.requestType === 'assertion') {

            if ( ! deviceObject?.iosPublicKeyPEM || deviceObject.iosPublicKeyPEM=='') {
                // The user previously got a nonce but did not provide an attestation
                return {isSuccessful: false, resultMessage: "Yo need to submit a successful attestation before requesting an assertion."};
            }

            let resultOperation = await CheckAppAssertion(
                req.body.token, 
                deviceObject.nonces[req.body.platformType+'_'+req.body.requestType].nonce, 
                deviceObject.iosPublicKeyPEM,
                deviceObject.iosSignCount);

            LogMe(2, 'Result of the operation: '+JSON.stringify(resultOperation));

            // Check assertion
            if (resultOperation.status !== 'success') {
                return {isSuccessful: false, resultMessage: resultOperation.message};
            }

            // Check things after assertion. These things are not attested directly but indirectly.

            // Check version
            let versionCheckResult = CheckIosVersion(req.body?.platformVersion);
            if (versionCheckResult.status !== 'success') {
                return {isSuccessful: false, resultMessage: versionCheckResult.message};
            }
            // Check maximum delay
            if (Date.now() - deviceObject.nonces[req.body.platformType + '_' + req.body.requestType].timestamp > MAX_TOTAL_DELAY_MS[req.body.platformType + '_' + req.body.requestType]) {
                return {isSuccessful: false, resultMessage: "Request too old. Took too long from generating the nonce on our server to checking it on our server."};
            }

            // Note: We do not attest device type (iPad, iPhone, Mac, ...)
            // Looks like Macs are not supported anyway. See: https://developer.apple.com/forums/thread/682488

            // Save publicKey and receipt for this device (sample code).
            const updateResult = await DevicesModel.updateOne(
                {cookie: req.body.cookie},
                {iosSignCount: resultOperation.iosSignCount}
            );

            if ( ! updateResult) {
                return {isSuccessful: false, resultMessage: "DB error when updating your request."};
            } 
        }

    }

    // Mark nonce as consumed
    const updateResult = await DevicesModel.updateOne(
        {cookie: req.body.cookie},
        [{ $addFields: { nonces: { [req.body.platformType+'_'+req.body.requestType]: {consumed: true} } } }]
    );
    if ( ! updateResult) {
        return {isSuccessful: false, resultMessage: 'DB error when updating the consumption status of the nonce.'};
    }

    // Success
    return {
        isSuccessful: true,
        resultMessage: 'Successful',
    };

  }




    @Post('/getNonceFromServer')
    async getNonceFromServer(@Req() req) {

        LogMe(1, 'Controller: attestations/getNonceFromServer');

        let resultVerifyRequest = checkRequestPlatformAndType(req.body.platformType, req.body.requestType);
        if ( ! resultVerifyRequest.result) {
            return {
                isSuccessful: false,
                resultMessage: resultVerifyRequest.message,
            };
        }

        let existingDeviceObject = await DevicesModel.findOne({'cookie': req.body.cookie });

        const myNonce = GenerateRandomString(PARAM_LENGTH_TOKENS);
        LogMe(1, 'Nonce: '+myNonce);

        if ( ! existingDeviceObject) {  // Device unseen before

            const myCookie = GenerateRandomString(PARAM_LENGTH_TOKENS);
    
            let newDeviceDocument = {
                nonces: {
                    android_classic: {
                        nonce: '',
                        timestamp: 0,
                        consumed: true,
                    },
                    android_standard: {
                        nonce: '',
                        timestamp: 0,
                        consumed: true,
                    },
                    ios_attestation: {
                        nonce: '',
                        timestamp: 0,
                        consumed: true,
                    },
                    ios_assertion: {
                        nonce: '',
                        timestamp: 0,
                        consumed: true,
                    },
                },
                cookie: myCookie,
                iosIsDevelopment: IOS_IS_DEVELOPMENT_ENVIRONMENT,
                iosPublicKeyPEM: '',
                iosReceipt: '',
            };

            newDeviceDocument.nonces[req.body.platformType+'_'+req.body.requestType] = 
                { nonce: myNonce,
                  timestamp: Date.now(),
                  consumed: false,
                };
    
            const mynewdevice = await DevicesModel.create(newDeviceDocument);
    
            if(mynewdevice) {
                return {
                    isSuccessful: true,
                    resultMessage: 'Nonce and cookie created successfully.',
                    nonce: myNonce,
                    cookie: myCookie,
                };
            } else {
                return {
                    isSuccessful: false,
                    resultMessage: 'There has been an error.',
                };
            }
    
        } else {  // Device seen before

            const updateResult = await DevicesModel.updateOne(
                {cookie: req.body.cookie},
                [{ $addFields: { nonces: { [req.body.platformType+'_'+req.body.requestType]: {nonce: myNonce, timestamp: Date.now(), consumed: false} }  } }]
                );

            if(updateResult) {
                return {
                    isSuccessful: true,
                    resultMessage: 'Nonce created successfully onto existing cookie.',
                    nonce: myNonce,
                    cookie: existingDeviceObject.cookie,
                };
            } else {
                return {
                    isSuccessful: false,
                    resultMessage: 'There has been an error.',
                };
            }

        }


    }
  
}
