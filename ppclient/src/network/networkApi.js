import { PARAM_SERVER_API_URL } from '../parameters.js';
import { ErrorAlert, LogMe } from '../myGeneralLibrary.jsx';


const POST_HEADERS = {
    method: 'POST',
    headers: {
        'Content-type': 'application/json',
    },
};



export async function ApiSubmitAttestationTokenToServer(environment, cookie, platformType, platformVersion, requestType, token, encryptedKeyB64) {

    LogMe(1, 'API: ApiSubmitAttestationTokenToServer');

    return fetch(`${PARAM_SERVER_API_URL}/attestations/submitAttestationTokenToServer`, {
        ...POST_HEADERS,
        body: JSON.stringify({
            cookie: cookie, 
            environment: environment, 
            platformVersion: platformVersion, 
            platformType: platformType, 
            subrequests: [{
                requestType: requestType, 
                token: token,
            }],
            encryptedKeyB64: encryptedKeyB64,
        }),
    })
    .then((res) => res.json())
    .then((res) => res)

}



export async function ApiSubmitTwoAttestationTokensToServer(environment, cookie, platformType, platformVersion, requestType1, token1, requestType2, token2, encryptedKeyB64) {

    LogMe(1, 'API: ApiSubmitAttestationTokenToServer');

    return fetch(`${PARAM_SERVER_API_URL}/attestations/submitAttestationTokenToServer`, {
        ...POST_HEADERS,
        body: JSON.stringify({
            cookie: cookie, 
            environment: environment, 
            platformVersion: platformVersion, 
            platformType: platformType, 
            subrequests: [{
                requestType: requestType1, 
                token: token1,
            },{
                requestType: requestType2, 
                token: token2,
            }],
            encryptedKeyB64: encryptedKeyB64,
        }),
    })
    .then((res) => res.json())
    .then((res) => res)

}


export async function ApiGetNonceFromServer(cookie, platformType, requestType) {

    LogMe(1, 'API: ApiGetNonceFromServer');
    LogMe(1, 'API: ApiGetNonceFromServer, cookie='+cookie);

    return fetch(`${PARAM_SERVER_API_URL}/attestations/getNonceFromServer`, {
        ...POST_HEADERS,
        body: JSON.stringify({cookie, platformType, requestType}),
    })
    .then((res) => res.json())
    .then((res) => res)
}


export async function ApiTestNetworkConnection() {

    LogMe(1, 'API: ApiTestNetworkConnection');

    return fetch(`${PARAM_SERVER_API_URL}/test/doNothing`, {
        ...POST_HEADERS,
        body: JSON.stringify({}),
    })
    .then((res) => res.json())
    .then((res) => res)
}
