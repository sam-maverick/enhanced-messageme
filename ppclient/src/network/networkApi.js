import { PARAM_SERVER_API_URL } from '../parameters.js';
import { ErrorAlert, LogMe } from '../myGeneralLibrary.jsx';


const POST_HEADERS = {
    method: 'POST',
    headers: {
        'Content-type': 'application/json',
    },
};



export async function ApiSubmitAttestationTokenToServer(environment, token, cookie, platformType, platformVersion, requestType) {

    LogMe(1, 'API: ApiSubmitAttestationTokenToServer');

    return fetch(`${PARAM_SERVER_API_URL}/attestations/submitAttestationTokenToServer`, {
        ...POST_HEADERS,
        body: JSON.stringify({cookie, token, platformVersion, platformType, requestType, environment}),
    })
    .then((res) => res.json())
    .then((res) => res)

}


export async function ApiGetNonceFromServer(cookie, platformType, requestType) {

    LogMe(1, 'API: ApiGetNonceFromServer');

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
