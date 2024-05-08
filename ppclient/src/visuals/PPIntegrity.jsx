//import { StatusBar } from 'expo-status-bar';
import React, {useState, useCallback, useEffect, useRef} from 'react';
import { StyleSheet, Button, Text, TextInput, View, Alert, ScrollView, Platform } from 'react-native';
import * as Device from 'expo-device';
import RNRestart from 'react-native-restart';  // Use only in PROD
import { DevSettings} from 'react-native';  // Use only in DEV

import * as Integrity from 'expo-app-integrity';

import { TabsComponent } from './Tabs.jsx';

import { styles } from './myVisualsLibrary.jsx';
import { EraseLocalData, ErrorAlert, LogMe, UpdateLogMeUsername } from '../myGeneralLibrary.jsx';

import storage from '../storage/storageApi.js';

import { PARAM_GOOGLE_CLOUD_PROJECT_NUMBER, PARAM_IOS_KEY_IDENTIFIER } from '../parameters.js';

import { ApiGetNonceFromServer, ApiSubmitAttestationTokenToServer } from '../network/networkApi.js';


import * as AppIntegrity from '../integrity/integrityapis.js';




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

    return AppIntegrity.AndroidStandardWarmup(PARAM_GOOGLE_CLOUD_PROJECT_NUMBER.toString())
    .then( async () => {
        setWarmupStatusFunction('Successful');
        setWarmupInProgressFunction(false);
        LogMe(1, 'Warmup OK');
        return Promise.resolve(true);
    })
    .catch((error) => {
        ErrorAlert("Error from AppIntegrity API.\n"+JSON.stringify(error), undefined);  // API error
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

    let cloneAccountData = { ...someProps.AccountData};
    cloneAccountData[CookieName] = apiresgetnonce.cookie;
    // We store cookie only if attestation was successful
    // In practice, the cookie is only useful in iOS assertions
    try {
        await storage.save({
            key: 'accountData', // Note: Do not use underscore("_") in key!
            data: cloneAccountData,
        });

        saveMyProps({AccountData: cloneAccountData});
        
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
        // Don't do "resultingpromise = await AppIntegrity(..." here because the "then" already handles the "await"
        if (Platform.OS === 'android' && RequestType === 'classic') {
            resultingpromise = AppIntegrity.AndroidClassicRequest(apiresgetnonce.nonce, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER);
        } else if (Platform.OS === 'android' && RequestType === 'standard') {
            resultingpromise = AppIntegrity.AndroidStandardRequest(apiresgetnonce.nonce, PARAM_GOOGLE_CLOUD_PROJECT_NUMBER.toString());
        } else if (Platform.OS === 'ios' && RequestType === 'attestation') {
            resultingpromise = AppIntegrity.iosAppAttestRequest(keyIdentifier, apiresgetnonce.nonce);
        } else if (Platform.OS === 'ios' && RequestType === 'assertion') {
            resultingpromise = AppIntegrity.iosAppAssertRequest(keyIdentifier, apiresgetnonce.nonce);
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
            return ApiSubmitAttestationTokenToServer(environment, attestationTokenObject, apiresgetnonce.cookie, Platform.OS, Platform.Version, RequestType)
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
            ErrorAlert("Error from AppIntegrity API.\n"+JSON.stringify(error), undefined);  // API error
            setAttestationStatusFunction('ERROR');        
            setAttestationTestInProgressFunction(false);
            return Promise.resolve(false);
        });
    } catch (error) {
        ErrorAlert("Exception from AppIntegrity API.\n"+JSON.stringify(error), undefined);  // API error
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

    return AppIntegrity.iosKeygen(keypairName)
    .then( async () => {

        setKeygenStatusFunction('Successful');
        setKeygenInProgressFunction(false);
        LogMe(1, 'Key-pair generation OK');
        return Promise.resolve(true);

    })
    .catch((error) => {
        ErrorAlert("Error from AppIntegrity API.\n"+JSON.stringify(error), undefined);  // API error
        setKeygenStatusFunction('ERROR');        
        setKeygenInProgressFunction(false);
        LogMe(1, 'Key-pair generation KO');
        return Promise.resolve(false);
    });

}



export const PPIntegrityComponent = ({ route, navigation }) => {

    const [initStatus, setInitStatus] = useState({ key: 'init' });
    const [propsState, setPropsState] = useState(route.params);
    console.log('PPIntegrity/propsState'+JSON.stringify(propsState));
    console.log('PPIntegrity/route.params'+JSON.stringify(route.params));

    // Android (classic attestations) and iOS
    const [attestationStatus, setAttestationStatus] = useState('(press button)');
    const [attestationTestInProgress, setAttestationTestInProgress] = useState(false);

    // Only in Android
    const [attestationStatusStandard, setAttestationStatusStandard] = useState('(press button)');
    const [attestationTestInProgressStandard, setAttestationTestInProgressStandard] = useState(false);
    const [warmupStatusStandard, setWarmupStatusStandard] = useState('(press button)');
    const [warmupInProgressStandard, setWarmupInProgressStandard] = useState(false);

    // Only in iOS
    const [keygenInProgress, setkeygenInProgress] = useState(false);
    const [keygenStatus, setkeygenStatus] = useState('(press button)');
    const [assertionInProgress, setAssertionInProgress] = useState(false);
    const [assertionStatus, setAssertionStatus] = useState('(press button)');


    useEffect( () => {  // This is executed when the component is reloaded
        async function didMount() { // Do not change the name of this function
            // Do stuff
            LogMe(1, 'useEffect of PPIntegrity invocation');           
        }
        didMount();  // If we want useEffect to be asynchronous, we have to define didMount as async and call it right after
        return async function didUnmount() { // Do not change the name of this function
          // Cleanup tasks
          LogMe(1, 'useEffect of PPIntegrity cleanup');
        };
    }, []);  // App.js does not have props


    async function ComponentRefresh() {  // Invoked every time this screen is loaded
        LogMe(1, 'Refreshing PPIntegrity Component');
        if (initStatus.key === 'init') {
            LogMe(1, 'Initialising PPIntegrity Component');
            initStatus.key = 'updated'; //update without rendering
            //initStatus({ key:'updated'}); //update with rendering
            // This will reach only on the first time the scren is loaded
        }
    }



    const IntegrityInfoComponentIos = () => {
        if (Platform.OS === 'ios') {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Text style={{fontWeight: "bold"}}>Is App Integrity supported in this iOS device? {Integrity.isSupported() ? 'Yes' : 'No'}</Text>
                    </View>
                    <View style={styles.leftleft}>
                    <Text>Corresponds to Integrity.isSupported().</Text>
                    </View>
                </View>
            );
        } else {
            return;
        }     
    };


    const WarmupInfoComponentAndroid = () => {
        if (Platform.OS === 'android') {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Button disabled={warmupInProgressStandard} title='Do warmup now' onPress={() => DoWarmup(setWarmupStatusStandard, setWarmupInProgressStandard)} />
                    </View>
                    <View style={styles.leftleft}>
                        <Text>Warmup result is: </Text><Text style={{fontWeight: "bold"}}>{ warmupStatusStandard }</Text>
                    </View>

                    <View style={styles.leftleft}>
                    <Text>This only applies to standard requests in Android. API limits: Maximum 5 warmups per app instance per minute (if this threshold is exceeded, you will get a TOO_MANY_REQUESTS error). Note that if you set MAX_PARTIAL_DELAY_MS_STANDARD to less than one minute, and if you hit the Warmup button more than 5 times consecutively and then wait MAX_PARTIAL_DELAY_MS_STANDARD, you will find yourself temporarily unable to perform classic requests (temporary lockout).</Text>
                    </View>
                </View>
            );
        } else {
            return;
        }     
    };


    const StandardRequestComponentAndroid = () => {
        if (Platform.OS === 'android') {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Button disabled={attestationTestInProgressStandard} title='Check integrity (standard request)' onPress={() => CheckIntegrity('PPIntegrity', PARAM_IOS_KEY_IDENTIFIER.PPIntegrity, propsState, function (newProps) { setPropsState(newProps); }, setAttestationStatusStandard, setAttestationTestInProgressStandard, 'standard', 'PPIcookie')} />
                    </View>

                    <View style={styles.leftleft}>
                        <Text>This attestation is based on a hash of the intended user action. Note that the attested timestampMillis of the token corresponds to the time when the warmup was performed. This attestation contains security metrics. API limits: Maximum 10,000 requests per app platform per day ('requests' includes warmups and integrity tokens).</Text>
                    </View>
                    <View style={styles.leftleft}>
                        <Text>Attestation status is: </Text><Text style={{fontWeight: "bold"}}>{ attestationStatusStandard }</Text>
                    </View>
                </View>
            );
        } else {
            return;
        }     
    };

    
    const ClassicOrIosAttestRequestComponent = () => {
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        {
                            Platform.OS === 'android'
                            ?
                            <Button disabled={attestationTestInProgress} title="Check integrity (classic request)" onPress={() => CheckIntegrity('PPIntegrity', PARAM_IOS_KEY_IDENTIFIER.PPIntegrity, propsState, function (newProps) { setPropsState(newProps); }, setAttestationStatus, setAttestationTestInProgress, 'classic', 'PPIcookie')} />
                            :
                            <Button disabled={attestationTestInProgress} title="Do attestation" onPress={() => CheckIntegrity('PPIntegrity', PARAM_IOS_KEY_IDENTIFIER.PPIntegrity, propsState, function (newProps) { setPropsState(newProps); }, setAttestationStatus, setAttestationTestInProgress, 'attestation', 'PPIcookie')} />
                        }
                    </View>

                    <View style={styles.leftleft}>
                        <Text>This attestation is nonce-based.</Text>
                    </View>
                    <View style={styles.leftleft}>
                        <Text>{ 
                            Platform.OS === 'android'
                            ?
                            'This attestation does NOT contain security metrics. API limits: Maximum 5 integrity tokens per app instance per minute; and maximum 10,000 requests per app platform per day (an increase can be requested)'
                            :
                            'This attestation contains security metrics. In iOS, attestations are done typically only once after installing the app.'
                        }</Text>
                    </View>
                    <View style={styles.leftleft}>
                        <Text>Attestation status is: </Text><Text style={{fontWeight: "bold"}}>{ attestationStatus }</Text>
                    </View>
                </View>
            );
        } else {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Text style={{fontWeight: "bold"}}>Attestation is only supported in Android or iOS devices. Skipping Classic/iOS attestation. This device is {Platform.OS}.</Text>
                    </View>
                </View>
            );
        }     
    };
        

    const KeypairInfoComponentIos = () => {
        if (Platform.OS === 'ios') {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Button disabled={keygenInProgress} title='Generate new key-pair' onPress={() => DoKeygen(setkeygenStatus, setkeygenInProgress, PARAM_IOS_KEY_IDENTIFIER.PPIntegrity)} />
                    </View>
                    <View style={styles.leftleft}>
                        <Text>Keygen result is: </Text><Text style={{fontWeight: "bold"}}>{ keygenStatus }</Text>
                    </View>

                    <View style={styles.leftleft}>
                        <Text>Is there a key-pair stored locally? </Text>
                        <Text style={{fontWeight: "bold"}}>{propsState.AccountData.PPIiosKeypairName==='' ? 'No' : 'Yes'}</Text>
                    </View>
                    <View style={styles.leftleft}>
                    <Text>This only applies to iOS.</Text>
                    </View>
                </View>
            );
        } else {
            return;
            /*
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Text style={{fontWeight: "bold"}}>Non-ios device detected. Skipping key-pair generation/retrieval.</Text>
                    </View>
                </View>
            );
            */
        }     
    };


    const IosAssertionComponent = () => {
        if (Platform.OS === 'ios') {
            return(
                <View>
                    <Text />

                    <View style={styles.leftleft}>
                        <Button disabled={assertionInProgress} title='Do assertion' onPress={() => CheckIntegrity('PPIntegrity', PARAM_IOS_KEY_IDENTIFIER.PPIntegrity, propsState, function (newProps) { setPropsState(newProps); }, setAssertionStatus, setAssertionInProgress, 'assertion', 'PPIcookie')} />
                    </View>
                    <View style={styles.leftleft}>
                        <Text>Assertion result is: </Text><Text style={{fontWeight: "bold"}}>{ assertionStatus }</Text>
                    </View>

                    <View style={styles.leftleft}>
                        <Text>Do we hold an attested key-pair? </Text>
                        <Text style={{fontWeight: "bold"}}>{propsState.AccountData.PPIcookie==='' ? 'No' : 'Yes'}</Text>
                    </View>
                    <View style={styles.leftleft}>
                    <Text>This only applies to iOS.</Text>
                    </View>
                </View>
            );
        } else {
            return;
        }     
    };


    // Initialisation
    ComponentRefresh();
    
    
    return (
        <View style={styles.centercenterflex1}>
            <View style={styles.headertitle}>
                <Text style={styles.large}>Manual integrity tests</Text>
            </View>
            <View style={styles.centerleftflex1}>
                <View style={styles.leftleft}>
                    <Text>       </Text>{/* Left margin */}
                </View>
                <View style={styles.centerleftflex1}>
                    <ScrollView style={styles.scrollView}>{/* ScrollView already expands, so we set their children not to expand, otherwise the buttons expand */}

                        <IntegrityInfoComponentIos/>

                        <WarmupInfoComponentAndroid/>

                        <KeypairInfoComponentIos/>

                        <StandardRequestComponentAndroid/>

                        <ClassicOrIosAttestRequestComponent/>

                        <IosAssertionComponent/>

                        <Text />

                    </ScrollView>
                </View>
                <View style={styles.leftleft}>
                    <Text>       </Text>{/* Right margin */}
                </View>
            </View>
            <TabsComponent activeTab="PPIntegrity" props={{propsState}} />
        </View>
    );
};
