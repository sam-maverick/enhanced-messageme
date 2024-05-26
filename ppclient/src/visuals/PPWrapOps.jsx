import React, {useState, useCallback, useEffect, useRef} from 'react';
import { AppState, StyleSheet, Button, Text, TextInput, View, Alert, ScrollView, TouchableOpacity, Platform, Image, Dimensions } from 'react-native';
import * as Device from 'expo-device';

import * as Linking from 'expo-linking';
// NOTE: URL parameters are only available in EAS build. In the bare workflow, an internal Expo Go URL is used, which misses the actual original parameters.

//import * as FileSystem from 'expo-file-system';
var RNFS = require('react-native-fs');

//import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons/faTriangleExclamation';

//import FileProvider from 'react-native-file-provider';

import { disallowScreenshot, keepAwake } from 'react-native-screen-capture';

import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';

import { Mutex, Semaphore, withTimeout, tryAcquire, E_ALREADY_LOCKED, E_TIMEOUT } from 'async-mutex';

import { useNavigation } from '@react-navigation/native';

import { HeaderBackButton } from "@react-navigation/elements";

import { styles, LoadingComponent } from './myVisualsLibrary.jsx';
import { 
    EncodeFromB64ToBinary, 
    EncodeFromBinaryToB64, 
    EncodeFromB64ToUTF8,
    EncodeFromUTF8ToB64,
    EraseLocalData, 
    ErrorAlert, 
    ErrorAlertAsync, 
    AsyncAlert, 
    LogMe, 
    UpdateLogMeUsername, 
    InitialisationActions,
    ReadMyFileStream,
    WriteMyFileStream,
    IsValidImageExtensionAndContentType,
    SafeUrlEncodeForB64,
    SafeUrlDecodeForB64,
 } from '../myGeneralLibrary.jsx';

import storage from '../storage/storageApi.js';
import { PPEnrollmentComponent } from './PPEnrollment.jsx';
import { PPFinishedComponent } from './PPFinished.jsx';

import { PARAM_OUR_SCHEME, PARAM_DEBUG_MODE, PARAM_PP__PROCESSING_TIMEOUT_MS } from '../parameters.js';

import { WrapPicture, UnwrapPicture } from '../cryptography/wrapops.js';

var mutexPPclientAccess = withTimeout(new Mutex(), PARAM_PP__PROCESSING_TIMEOUT_MS);
var timeoutID = 0;
var androidContentUriGlobal = undefined;


export const PPWrapOpsComponent = (props) => {

    const [initStatus, setInitStatus] = useState({ key: 'init' });
    const [propsState, setPropsState] = useState(props.route.params);
    const [accountData, setAccountData] = useState({key: {}});
    const [screenToShow, setScreenToShow] = useState('none');

    const placeholderimage = require('../../assets/custom/paper.png');
    const loadingimage = require('../../assets/custom/loading.gif');
    const loading2image = require('../../assets/custom/loading2.gif');

    const [receivedPlainImageFromSourceUri, setReceivedPlainImageFromSourceUri] = useState(placeholderimage);
    const [receivedPlainImageAsRead, setReceivedPlainImageAsRead] = useState(placeholderimage);
    const [wrappedImageData, setWrappedImageData] = useState(placeholderimage);
    const [wrappedImageFromSourceUri, setWrappedImageFromSourceUri] = useState(placeholderimage);
    const [requestedUrlParams, setRequestedUrlParams] = useState({});

    const [operationTitle, setOperationTitle] = useState('');

    const [showPrivatePicture, setShowPrivatePicture] = useState(false);
    const [privatePictureContents, setPrivatePictureContents] = useState(placeholderimage);
    const [timerExpired, setTimerExpired] = useState(false);
    const [reportingFunction, setReportingFunction] = useState(() => () => {});
    const [returnFunction, setReturnFunction] = useState(() => () => {});
    const appState = useRef(AppState.currentState);
    
    const navigation = useNavigation();


    useEffect( () => {  // This is executed when the component is reloaded
        async function didMount() { // Do not change the name of this function
            // Do stuff
            LogMe(1, 'useEffect of PPWrapOps invocation');  
  
            disallowScreenshot(true);

            const subscription = AppState.addEventListener('change', async (nextAppState) => {
                if (
                        appState.current.match(/active/) &&
                        (nextAppState === 'inactive' || nextAppState === 'background')
                    ) {
                  LogMe(1, 'App state changed from active to inactive|background');
                  LogMe(1, 'Calling ClearWorkingData() for a partial clean on app state change');
                  setTimerExpired(true);
                  await ClearWorkingData({mode: 'partial', androidContentUri: androidContentUriGlobal});
                }
                // NOTE: Using inactive->active event is problematic because it makes the jobcompleted screen appear while it is still processing a private picture
                /*
                if (
                        appState.current.match(/inactive|background/) &&
                        nextAppState === 'active'
                    ) {
                  LogMe(1, 'App state changed from inactive|background to active');
                  await ClearWorkingData({mode: 'full', androidContentUri: androidContentUriGlobal});
                  setScreenToShow('jobcompleted');
                }
                */
            });              

            // This can't be executed in ComponentRefresh!! It throws an error about updating component while rendering component
            // We could still use this to show a "go back" link (left arrow on top left)
            /*
            navigation.setOptions({
                headerShown: true,
                headerLeft: (props) => (
                    <HeaderBackButton
                        {...props}
                        onPress={() => {
                            navigation.navigate('PPIntegrity', {
                                propsState,
                            });  // Screen that will be loaded when pressing left arrow (back button)
                        }}
                    />
                )
            });   
            */

            /*
            // This would be redundant because even when the app is launched, ComponentRefresh already captures the URL data
            let requestedString = await Linking.getInitialURL();
            //Linking.useURL() yields null when a Linking.addEventListener() event is triggered
            if ( ! (requestedString == null)) {  // URL request made the ppclient app to launch
                LogMe(1, '! requestedString == null');
                await ProcessUrlRequest(requestedString);  // Update graphics - mostly for troubleshooting    
            }  
            */           

        }

        didMount();  // If we want useEffect to be asynchronous, we have to define didMount as async and call it right after
        return async function didUnmount() { // Do not change the name of this function
          // Cleanup tasks
          LogMe(1, 'useEffect of PPWrapOps cleanup');
        };

    }, []);  // App.js does not have props


    // This function will be called both when a deep link starts the app and when a deep link foregrounds the app
    async function ComponentRefresh() {  // Invoked every time this screen is loaded

        LogMe(1, 'Refreshing PPWrapOps Component');
        LogMe(2, 'props: '+JSON.stringify(props));
        if (initStatus.key === 'init') {
            LogMe(1, 'Initialising PPWrapOps Component');
            initStatus.key = 'updated'; //update without rendering
            //initStatus({ key:'updated'}); //update with rendering
            // This will reach only on the first time the scren is loaded    
        }

        if (props.route.path !== 'consumed') {
            props.route.path = 'consumed';

            try {
                LogMe(1, 'Trying to acquire mutex');  // For added security, we force to process requests serially
                await mutexPPclientAccess.runExclusive(async() => {  // blocking call; if mutex is busy it waits
                    // tasks
                    LogMe(1, 'Mutex acquired; request will be processed now'); 
                    await ProcessUrlRequest(props.route.params);  // await omitted as it is the last command
                });
            } catch (e) {
                if (e === E_TIMEOUT) {
                    LogMe(1, 'mutexPPclientAccess released by timeout'); 
                    throw new Error('There has been a timeout; releasing resources for other requests.');
                } else {
                    LogMe(1, 'An error has occurred: '+e.stack); 
                    ErrorAlert('Error when processing request', e);
                }
            } finally {
                // There is no need for releasing:
                // https://www.npmjs.com/package/async-mutex
                // Once the promise is resolved or rejected (or immediately after execution if an immediate value was returned), the mutex is released. runExclusive returns a promise that adopts the state of the function result.
            }

        }
    }

    /**
     * 
     * @param {mode} options : mode can be 'partial' or 'full'
     */
    async function ClearWorkingData(options) {
        LogMe(1, 'ClearWorkingData() called with option: '+JSON.stringify(options));

        // Clear timer from previous image(s), for the cases where app is minimized before timer expiration.
        if (options?.mode==='full') {
            LogMe(1, 'ClearWorkingData(): timeoutID = '+timeoutID);
            clearTimeout(timeoutID);
            timeoutID = 0;
        }

        if (options?.mode==='full' || options?.mode==='partial') {
            setRequestedUrlParams({});
            setPrivatePictureContents(placeholderimage);
            if (Platform.OS === 'android' && options.androidContentUri) {
                ////LogMe(1, 'ClearWorkingData(): Clearing Android FileProvider permissions');
                ////await FileProvider.revokeUriPermissionR(options.androidContentUri);  // Apparently, we can do this from the recipient app
            }          
            androidContentUriGlobal = undefined;  
        }

        if (options?.mode==='full') {
            setShowPrivatePicture(false);
            setTimerExpired(false);
            setReportingFunction((previous) => {
                    return async () => {};
                }
            );        
            setReturnFunction((previous) => {
                    return async () => {};
                }
            );            
        }

        if (options?.mode==='full' || options?.mode==='partial') {
            gc();  // Call garbage collector
        }
    }

    async function ProcessUrlRequest (urlParams) {
        LogMe(1, 'ProcessUrlRequest() called');
        LogMe(1, 'url: '+JSON.stringify(urlParams));
        LogMe(1, 'url is of type: '+typeof(urlParams));

        LogMe(1, 'ProcessUrlRequest(): calling ClearWorkingData() before beginning operations');
        await ClearWorkingData({mode: 'full', androidContentUri: undefined});
        androidContentUriGlobal = urlParams?.fileUri;

        setRequestedUrlParams(urlParams);

        if (PARAM_DEBUG_MODE) {
            setReceivedPlainImageFromSourceUri(placeholderimage);
            setReceivedPlainImageAsRead(placeholderimage);
            setWrappedImageData(placeholderimage);
            setWrappedImageFromSourceUri(placeholderimage);
        }

        // GET USER PROFILE DATA 

        try {
            const storagenewdata = {
                syncInBackground: false,        
                key: 'accountData',
            };
            let retStorage = await storage.load(storagenewdata);
            LogMe(1,'Loaded from storage: '+JSON.stringify(retStorage));
            
            // Previously stored values
            accountData.key = { ...retStorage };
            UpdateLogMeUsername(retStorage.username);
    
        } catch(error) {

            LogMe(2, 'Setting defaults for in-memory accountData');

            // Default volatile startup values
            accountData.key = {
              'username': '',
              'PPIcookie': '',
              'PPEcookie': '',
              'enrollmentAttempted': false,
              'enrollmentCompleted': false,
            };

            try {
                await InitialisationActions();   
            } catch(error) {
                await ErrorAlertAsync('Error in InitialisationActions()', error);  // Some error
                setScreenToShow('jobcompleted');  
                return;
            }
    
            // any exception including data not found goes to catch()
            switch (error.name) {
              case 'NotFoundError':
                LogMe(1, 'ProcessUrlRequest() storage NotFoundError');
                break;
              case 'ExpiredError':
                LogMe(1, 'ProcessUrlRequest() storage ExpiredError');
                break;
              default:
                await ErrorAlertAsync(error.message, error);  // Storage error
                setScreenToShow('jobcompleted');  
                return;
            }
        }


        // CHECK INPUT AND ENVIRONMENT

        if ( (Platform.OS !== 'android') && (Platform.OS !== 'ios') ) {
            await ErrorAlertAsync('Patform not supported: '+Platform.OS, undefined);
            setScreenToShow('jobcompleted');  
            return;
        }

        // Note: urlParams is of type object, but not of type URL
        if (urlParams?.operationName === 'unwrap' && urlParams?.imageUriReference === undefined)  { ErrorAlert('Error: imageUriReference parameter missing', undefined); return; }
        if (urlParams?.callbackURL === undefined)  { ErrorAlert('Error: callbackURL parameter missing', undefined); return; }
        if (urlParams?.authToken === undefined)  { ErrorAlert('Error: authToken parameter missing', undefined); return; }
        let callbackURL = new URL(urlParams.callbackURL);
        if (callbackURL.protocol.toLowerCase() == PARAM_OUR_SCHEME)  { ErrorAlert('Error: Loop detected: callbackURL cannot be of protocol '+PARAM_OUR_SCHEME, undefined) }
        callbackURL.searchParams.append('authToken', urlParams.authToken);

        if ( ! accountData.key.enrollmentAttempted) {
            LogMe(1, '--------- Cold boot - Attempting enrollment now as it looks like first time run ------------');
            setScreenToShow('enrollment');  // It should come back with the callback
            return;
        }

        let errormsgoncheck = '';
        if ((!PARAM_DEBUG_MODE) && (accountData.key.enrollmentCompleted !== true) ) {
            errormsgoncheck = 'Ooops. This device has not been able to complete the enrollment. Is your device rooted? Check that you downloaded the app via the official store, and that you have all security protections enabled.';
        }
        // Unless stated explicitly by our custom build parameter, we do not allow debug/emulated environments
        if ((! PARAM_DEBUG_MODE) && (! Device.isDevice) ) {
            errormsgoncheck = 'Running on an emulator is not allowed in production.';
        }
        if ((! PARAM_DEBUG_MODE) && __DEV__ ) {
            errormsgoncheck = 'Running with debugging enabled is not allowed in production.';
        }

        // Under any error condition, abort
        if (errormsgoncheck != '') {
            callbackURL.searchParams.append('result', 'fail');    
            callbackURL.searchParams.append('message', errormsgoncheck);  // This may cause the calling messaging app to display an additional error message, depending on how it handles exceptions
            await ErrorAlertAsync(errormsgoncheck+' Press Ok to come back to your messaging app.', undefined);  
            setScreenToShow('jobcompleted');  
            Linking.openURL(callbackURL.toString());
            return;
        }


        // PERFORM OPERATION

        if (urlParams?.operationName === 'wrap') {
            try {
                LogMe(1, '--------- DO STUFF: wrap ------------');
                setOperationTitle('Wrapping your private picture...');
                setScreenToShow('wrapop');
                // 
                //
                
                let plainPrivatePictureContents = '';
                let wrappedPrivatePictureContents = '';
    
                if (urlParams?.privacyPolicies === undefined)  { ErrorAlert('Error: privacyPolicies parameter missing', undefined); return; }
                let privacyPolicies = JSON.parse(EncodeFromB64ToBinary(SafeUrlDecodeForB64(urlParams.privacyPolicies)));
                LogMe(1, 'privacyPolicies: ' + JSON.stringify(privacyPolicies));

                if (Platform.OS === 'android') {
                    if (urlParams?.fileUri === undefined)  { ErrorAlert('Error: fileUri parameter missing', undefined); return; }

                    LogMe(1, 'Received Uri: '+urlParams.fileUri);
                    if (PARAM_DEBUG_MODE)  { setReceivedPlainImageFromSourceUri({uri: urlParams.fileUri}); }
                    LogMe(1, 'Reading '+urlParams.fileUri);
    
                    // Neither RNFS ir FileSystem work because of
                    // https://docs.expo.dev/versions/latest/sdk/filesystem/#supported-uri-schemes
                    // https://stackoverflow.com/questions/46278019/how-do-i-read-file-with-content-uri-in-react-native-on-android
                    // Symptom: Program is stuck in reading the file, but no error is seen on the Android logcat
                    //plainPrivatePictureContents = await RNFS.readFile(urlParams.fileUri, 'base64');
                    //plainPrivatePictureContents = await FileSystem.readAsStringAsync(urlParams.fileUri, {encoding: 'base64'}); // Read image contents
    
                    // This is to check visibility of the messaging app
                    // If the messaging app does not appear here, Android will likely throw an error complaining about FileProvider not found
                    // Keep the line below commented in production!!
                    ////LogMe(1, await FileProvider.getListOfInstalledApps());

                    plainPrivatePictureContents = await ReadMyFileStream(urlParams.fileUri, 'base64');
                                        
                    LogMe(1, 'Read');
                } else {
                    plainPrivatePictureContents = SafeUrlDecodeForB64(urlParams.fileContents);
                }
    
                // We assume that the extension coincides with the ISO content-type            
                let fileExt = urlParams.fileUri.split('.').pop();
                if (fileExt=='jpg') { fileExt='jpeg' }  // piexif.insert() library replaces jpg by jpeg
                LogMe(1, 'Detected extension: '+fileExt);            
                if (!IsValidImageExtensionAndContentType(fileExt)) {
                    LogMe(1, 'Image URI extension is not valid: '+fileExt);
                    throw Error('Image URI extension is not valid.');                   
                } else {
                    LogMe(1, 'Extension is valid');            
                }
                
                LogMe(2, 'plainPrivatePictureContents: '+plainPrivatePictureContents);
                LogMe(1, 'plainPrivatePictureContents length: '+plainPrivatePictureContents.length);
                if (PARAM_DEBUG_MODE)  { setReceivedPlainImageAsRead({uri: 'data:image/' + fileExt + ';base64,' + plainPrivatePictureContents}); }
    
                LogMe(1, 'Wrapping');
                wrappedPrivatePictureContents = await WrapPicture(plainPrivatePictureContents, fileExt, accountData.key, privacyPolicies);  // Do the magic on the picture
                fileExt = 'png';
                LogMe(1, 'Wrapped');
    
                if (Platform.OS === 'android') {
                    LogMe(1, 'Writing '+urlParams.fileUri);
                    // https://stackoverflow.com/questions/46278019/how-do-i-read-file-with-content-uri-in-react-native-on-android
                    await WriteMyFileStream(urlParams.fileUri, 'base64', false, wrappedPrivatePictureContents);
    
                    LogMe(1, 'Written');
                    if (PARAM_DEBUG_MODE)  { setWrappedImageFromSourceUri({uri: urlParams.fileUri}); }
                    LogMe(1, 'UI updated');
    
                } else {
                    callbackURL.searchParams.append('fileContents', SafeUrlEncodeForB64(wrappedPrivatePictureContents));
                }
    
                LogMe(2, '----- wrappedPrivatePictureContents: '+wrappedPrivatePictureContents);
                LogMe(1,'wrappedPrivatePictureContents length: '+wrappedPrivatePictureContents.length);
                if (PARAM_DEBUG_MODE)  { setWrappedImageData({ uri: 'data:image/' + fileExt + ';base64,' + wrappedPrivatePictureContents}); }
                
                // Work done. Come back to the messaging app
                callbackURL.searchParams.append('result', 'success');  
                setScreenToShow('jobcompleted');  
                Linking.openURL(callbackURL.toString());
    
            } catch (err) {
                let errormsg = 'Ooops. An unexpected error has occurred while wrapping the image: `' + err.message + '`. ';
                callbackURL.searchParams.append('result', 'fail');    
                callbackURL.searchParams.append('message', err.message);  // This may cause the calling messaging app to display an additional error message, depending on how it handles exceptions
                await ErrorAlertAsync(errormsg+' Press Ok to come back to your messaging app.', err);
                setScreenToShow('jobcompleted');  
                Linking.openURL(callbackURL.toString());    
            }

        } else if (urlParams?.operationName === 'unwrap') {

            LogMe(1, '--------- DO STUFF: unwrap ------------');
            setOperationTitle('Unwrapping your private picture...');
            setScreenToShow('unwrapop');
            //
            //
            try {

                let wrappedPrivatePictureContents = '';

                if (Platform.OS === 'android') {
                    if (urlParams?.fileUri === undefined)  { ErrorAlert('Error: fileUri parameter missing', undefined); return; }

                    LogMe(1, 'Received Uri: '+urlParams.fileUri);
                    LogMe(1, 'Reading '+urlParams.fileUri);

                    // Neither RNFS ir FileSystem work because of
                    // https://docs.expo.dev/versions/latest/sdk/filesystem/#supported-uri-schemes
                    // https://stackoverflow.com/questions/46278019/how-do-i-read-file-with-content-uri-in-react-native-on-android
                    // Symptom: Program is stuck in reading the file, but no error is seen on the Android logcat
                    //wrappedPrivatePictureContents = await RNFS.readFile(urlParams.fileUri, 'base64');
                    //wrappedPrivatePictureContents = await FileSystem.readAsStringAsync(urlParams.fileUri, {encoding: 'base64'}); // Read image contents

                    wrappedPrivatePictureContents = await ReadMyFileStream(urlParams.fileUri, 'base64');

                    LogMe(1, 'Read');
                } else {
                    wrappedPrivatePictureContents = SafeUrlDecodeForB64(urlParams.fileContents);
                }

                let unwrappedDataObject = await UnwrapPicture(wrappedPrivatePictureContents, accountData.key);

                LogMe(1, 'privacyPolicies: '+JSON.stringify(unwrappedDataObject.privacyPolicies));

                let KeepOpenTimerMs = 1;
                switch (unwrappedDataObject.privacyPolicies.KeepOpenTimer) {
                    case '10 seconds':
                        KeepOpenTimerMs = 10 * 1000;
                        break;
                    case '2 minutes':
                        KeepOpenTimerMs = 2 * 60 * 1000;
                        break;
                    case '2 hours':
                        KeepOpenTimerMs = 2 * 60 * 60 * 1000;
                        break;
                }
                LogMe(1, 'KeepOpenTimer set to: '+KeepOpenTimerMs.toString());

                setPrivatePictureContents({uri: 'data:image/'+unwrappedDataObject.contentType+';base64,'+unwrappedDataObject.data});

                setReportingFunction((previous) => {
                    return async () => {
                        LogMe(1, 'reportingFunction() called');
                        callbackURL.searchParams.append('result', 'report');  
                        callbackURL.searchParams.append('RefImageUri', urlParams?.imageUriReference);
                        setScreenToShow('jobcompleted');
                        LogMe(1, 'calling ClearWorkingData() on reportingFunction() before Linking.openURL()');
                        await ClearWorkingData({mode: 'full', androidContentUri: urlParams?.fileUri});
                        Linking.openURL(callbackURL.toString());  
                    }
                });

                setReturnFunction((previous) => {
                    return async () => {
                        LogMe(1, 'returnFunction() called');
                        callbackURL.searchParams.append('result', 'success');  
                        setScreenToShow('jobcompleted');
                        LogMe(1, 'calling ClearWorkingData() on returnFunction() before Linking.openURL()');
                        await ClearWorkingData({mode: 'full', androidContentUri: urlParams?.fileUri});
                        Linking.openURL(callbackURL.toString());  
                    }
                });

                timeoutID = setTimeout(
                    async() => {
                        setTimerExpired(true);
                        LogMe(1, 'Calling ClearWorkingData() for a partial clean on setTimeout() timer expired');
                        await ClearWorkingData({mode: 'partial', androidContentUri: urlParams?.fileUri});
                    }, 
                    KeepOpenTimerMs
                );
                LogMe(1, 'timeoutID: '+timeoutID);

                setShowPrivatePicture(true);

            } catch (err) {
                let errormsg = 'Ooops. An unexpected error has occurred while unwrapping the image: `' + err.message + '`. ';
                LogMe(1, errormsg);
                callbackURL.searchParams.append('result', 'fail');    
                callbackURL.searchParams.append('message', err.message);  // This may cause the calling messaging app to display an additional error message, depending on how it handles exceptions
                await ErrorAlertAsync(errormsg+' Press Ok to come back to your messaging app.', err);
                setScreenToShow('jobcompleted');  
                Linking.openURL(callbackURL.toString());    
            }




        } else {
            await ErrorAlertAsync('API programming error. Unknown operation: '+urlParams?.operationName, undefined);
        }

    }
    

    const onEnrollmentAttempt = (hasItBeenSuccessful, originalUrlParams) => {
        LogMe(1, 'onEnrollmentAttempt()');
        if (hasItBeenSuccessful) {
            LogMe(1, 'onEnrollmentAttempt(): Enrollment successful; returing to ProcessUrlRequest()');
            try {
                ProcessUrlRequest(originalUrlParams);  // await omitted as it is the last command
            } catch (err) {
                ErrorAlert('Error when processing request', err);
            }
        } else {
            LogMe(1, 'onEnrollmentAttempt(): Enrollment unsuccessful');
        }
    }


    const ExtraInfoComponent = () => {
        if (PARAM_DEBUG_MODE && screenToShow === 'wrapop') {
            return (
            <View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}>URL params:</Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}> </Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}>{ JSON.stringify(requestedUrlParams) }</Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}> </Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}>Received image, linked to the shared FileProvider source (Android only):</Text>
                </View>
                <Image
                    style={styles.imagewrp}
                    source={receivedPlainImageFromSourceUri}
                    alt="Placeholder for: Received image, linked to the shared FileProvider source (Android only)"
                />
                <View style={styles.leftleft}>
                    <Text style={styles.medium}> </Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}>Received image, as read from the input:</Text>
                </View>
                <Image
                    style={styles.imagewrp}
                    source={receivedPlainImageAsRead}
                    alt="Placeholder for: Received image, as read from the input"
                />
                <View style={styles.leftleft}>
                    <Text style={styles.medium}> </Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}>Wrapped image, from wrapper output data:</Text>
                </View>
                <Image
                    style={styles.imagewrp}
                    source={wrappedImageData}
                    alt="Placeholder for: Wrapped image, from wrapper output data"
                />
                <View style={styles.leftleft}>
                    <Text style={styles.medium}> </Text>
                </View>
                <View style={styles.leftleft}>
                    <Text style={styles.medium}>Wrapped image, linked to the shared FileProvider source (Android only):</Text>
                </View>
                <Image
                    style={styles.imagewrp}
                    source={wrappedImageFromSourceUri}
                    alt="Placeholder for: Wrapped image, linked to the shared FileProvider source (Android only)"
                />
                <View style={styles.leftleft}>
                    <Text style={styles.medium}> </Text>
                </View>

            </View>
            );
        } else {
            return(<View><Text> </Text></View>);
        }
    }



    const PicturePayloadsComponent = () => {
        if (timerExpired) {
            return(
                <View style={styles.centercenterflex1}>
    
                <View style={styles.leftleft}>
                    <Text style={styles.large}>Picture has expired</Text>
                </View>                

                <View style={styles.leftleft}>
                    <Button title='Go back to your app' onPress={returnFunction} />
                </View>                
    
                </View>
            );
        } else {
            return (
                <View style={styles.centerleftflex1black}>
    
                <ReactNativeZoomableView
                    maxZoom={3}
                    minZoom={0.2}
                    zoomStep={0.5}
                    initialZoom={1}
                    bindToBorders={true}
                    style={{
                        padding: 0,
                        backgroundColor: 'black',
                    }}
                >
                    <Image
                        style={styles.imagewrpfull}
                        source={privatePictureContents}
                        alt="Placeholder for: Contents of the private picture"
                    />
                </ReactNativeZoomableView>
    
                    { /*<ExtraInfoComponent/> */ }
    
                </View>
            );    
        }
    }


    ComponentRefresh();


    if ( (screenToShow === 'unwrapop' && !showPrivatePicture) || screenToShow === 'wrapop') {
        return (
            <View style={styles.centercenterflex1}>

                <View style={styles.headertitlewithback}>
    
                    <View style={styles.headertitleleftcenter}>
                        <View style={{opacity: 0}}>
                            <FontAwesomeIcon
                                size={35}
                                icon={faArrowLeft}
                            />
                        </View>
                    </View>

                    <View style={styles.headertitlecentercenterflex1}>
                        <Text style={styles.large}>{operationTitle}</Text>
                    </View>

                    <View style={styles.headertitleleftcenter}>    
                    </View>

                </View>

                <View style={styles.centerleftflex1}>
                    <View style={styles.leftleft}>
                        <Text>       </Text>{/* Left margin */}
                    </View>
                    <View style={styles.centerleftflex1}>

                        <Image
                            style={styles.imagewrp}
                            source={screenToShow === 'wrapop' ? loadingimage : loading2image}
                            alt="Placeholder for: Loading..."
                        />

                        { /*<ExtraInfoComponent/> */ }

                    </View>
                    <View style={styles.leftleft}>
                        <Text>       </Text>{/* Right margin */}
                    </View>
                </View>
            </View>
        );  
    } else if ((screenToShow === 'unwrapop' && showPrivatePicture)) {  
        return (
            <View style={styles.centercenterflex1}>

                <View style={styles.headertitlewithback}>

                    <View style={styles.headertitleleftcenter}>
                        <Text style={styles.large}>  </Text>
                        <View>
                            <TouchableOpacity onPress={returnFunction}>
                                <FontAwesomeIcon
                                    size={35}
                                    icon={faArrowLeft}
                                    color={'blue'}
                                />
                            </TouchableOpacity>
                        </View>
                        <View>
                            <Text style={styles.large}>  Back to your app</Text>
                        </View>
                    </View>

                    <View style={styles.headertitlecentercenterflex1}>
                        <Text style={styles.large}>{/* text in the center */}</Text>
                    </View>

                    <View style={styles.headertitleleftcenter}>    
                        <View>
                            <TouchableOpacity onPress={reportingFunction}>
                                <FontAwesomeIcon
                                    size={25}
                                    icon={faTriangleExclamation}
                                    color={'#FF2222'}
                                />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.large}>  </Text>
                    </View>

                </View>

                <PicturePayloadsComponent />

            </View>
        );  
    } else if (screenToShow === 'enrollment') {
        return (<PPEnrollmentComponent requestedUrlParams={requestedUrlParams} callbackOnFinish={onEnrollmentAttempt} route={{ params: { AccountData:  accountData.key } }} />)
    } else if (screenToShow === 'jobcompleted') {
        return (<PPFinishedComponent route={{ params: { AccountData:  accountData.key } }} />)
    } else {
        return (<LoadingComponent />);
    }

};

