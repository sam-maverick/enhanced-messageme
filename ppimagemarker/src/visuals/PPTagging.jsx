//import { StatusBar } from 'expo-status-bar';
import React, {useState, useCallback, useEffect, useRef} from 'react';
import { StyleSheet, Button, Text, TextInput, View, Alert, ScrollView, Platform, Image } from 'react-native';

import * as FileSystem from 'expo-file-system';
import uuid from 'react-native-uuid';

import { ImagePicker, Album, Asset } from 'expo-image-multiple-picker';
import * as ExpoImagePicker from 'expo-image-picker';
import * as piexif from 'piexifjs';
import { CameraRoll } from "@react-native-camera-roll/camera-roll";

import { TabsComponent } from './Tabs.jsx';

import { styles } from './myVisualsLibrary.jsx';
import { 
    EraseLocalData, 
    ErrorAlert, 
    LogMe, 
    WriteMyFileStream,
    UpdateLogMeUsername, 
    IsValidImageExtensionAndContentType,
    AsyncAlert,
 } from '../myGeneralLibrary.jsx';

 import { 
    PARAM_PRIVATE_PICTURES_ALBUM_NAME,
    PARAM_PRIVATE_PICTURES_TMP_DIRNAME,
    PARAM_WELCOME_MESSAGE,
 } from '../parameters.js';

import storage from '../storage/storageApi.js';

//import * as AndroidPermanentMediaOverwritePermissions from 'android-permanent-media-overwrite-permissions';



export const PPTaggingComponent = (props) => {

    const [initStatus, setInitStatus] = useState({ key: 'init' });
    const [privateAlbumID, setPrivateAlbumId] = useState({ key: 0 });
    const [imagePermissionsGranted, setImagePermissionsGranted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState();
    const [propsState, setPropsState] = useState(props.route.params);

    LogMe(1, 'Initial propsState.AccountData.taggedPictures: '+JSON.stringify(propsState.AccountData.taggedPictures));

    // Internal state, only initialized when 
    const [internalSyncState, setInternalState] = useState({ attempted: false, completed: false });
    const [internalDummyState, setInternalDummyState] = useState();  // Used to force refresh

    // Image picker
    const [open, setOpen] = useState(true);
    //const [album, setAlbum] = useState<Album | undefined>();
    const [album, setAlbum] = useState();
    //const [assets, setAssets] = useState<Asset[]>([]);
    const [assets, setAssets] = useState();

    async function processPictureChange (imageInCameraRoll, checked) {
        LogMe(1,'processPictureChange() with imageInCameraRoll='+JSON.stringify(imageInCameraRoll)+' and checked='+checked);

        if (imageInCameraRoll.albumId == privateAlbumID.key) {
            setProcessingMessage('');
            setIsProcessing(true);
            await AsyncAlert('Pictures in the '+PARAM_PRIVATE_PICTURES_ALBUM_NAME+' album cannot be marked because they are already marked.');
            setAssets([]);
            setIsProcessing(false);
        } else {
            if (checked) {
                setProcessingMessage('Processing image. Please wait.');
                setIsProcessing(true);
                let ImagePathTmp = '';
                try {
         
                    // LIMITATION: We can't delete files in shared storage, with the regular permissions
                    // In Android, to delete files in shared storage we need to use special APIs
                    
                    let fileExt = imageInCameraRoll.uri.split('.').pop().toLowerCase();
                    if (fileExt=='jpg') { fileExt='jpeg' }  // piexif.insert() library replaces jpg by jpeg
                    if (!IsValidImageExtensionAndContentType(fileExt)) {
                        ErrorAlert('Image URI extension is not valid: '+fileExt);  
                        return;                 
                    } 
                    if (fileExt!='jpeg' &&  fileExt!='tiff') {
                        // Unsupported
                        ErrorAlert('Image extension '+fileExt+' is not supported. Only jpg/jpeg and tiff images are supported.');
                        return;
                    }
                    // Get exif data as object. jpegData must be a string that starts with "data:image/jpeg;base64,"(DataURL), "\xff\xd8", or "Exif".
                    LogMe(1,'processPictureChange(): readAsStringAsync');
                    let fileContentsOriginal = await FileSystem.readAsStringAsync(imageInCameraRoll.uri, {encoding: 'base64'});
                    let dataUri = 'data:image/'+fileExt+';base64,'+fileContentsOriginal;
                    LogMe(2,'processPictureChange(): dataUri: ----'+dataUri);
                    LogMe(1,'processPictureChange(): piexif.load');
                    let exifObj = piexif.load(dataUri);
                    LogMe(2,'exifObj original: '+JSON.stringify(exifObj));
        
                    let newValue = 'Private picture';
                    if (exifObj?.Exif) {
                        LogMe(1,'processPictureChange(): Exif exists in metadata');
                        exifObj['Exif'][piexif.ExifIFD.UserComment] = newValue;
                    } else {
                        LogMe(1,'processPictureChange(): Exif DOES NOT exist in metadata');
                        exifObj = {...exifObj, 'Exif' : { [piexif.ExifIFD.UserComment] : [newValue]}};
                    }
                    LogMe(2,'exifObj modified: '+JSON.stringify(exifObj));
                    LogMe(1,'processPictureChange(): piexif.dump');
                    let exifBytes = piexif.dump(exifObj);
        
                    LogMe(1,'processPictureChange(): piexif.insert');
                    let dataContentsWithInsertedMetadata = await piexif.insert(exifBytes, dataUri);
                    let base64ContentsWithInsertedMetadata = dataContentsWithInsertedMetadata.replace('data:image/'+fileExt+';base64,', '');
                    LogMe(2,'processPictureChange(): base64ContentsWithInsertedMetadata: ----'+base64ContentsWithInsertedMetadata);
        
                    // 
                    LogMe(1,'processPictureChange(): Deleting/Writing to files');
                    
                    ImagePathTmp = FileSystem.documentDirectory + PARAM_PRIVATE_PICTURES_TMP_DIRNAME + '/' + uuid.v4() + '.' + fileExt;
        
                    LogMe(1,'processPictureChange(): writeAsStringAsync');
                    await FileSystem.writeAsStringAsync(ImagePathTmp, base64ContentsWithInsertedMetadata, {encoding: 'base64'});
                    LogMe(1, 'processPictureChange(): Tmp file saved to workspace: ' + ImagePathTmp); 
        
                    LogMe(1,'processPictureChange(): CameraRoll.saveAsset');
                    await CameraRoll.saveAsset(ImagePathTmp, { type: 'auto', album: PARAM_PRIVATE_PICTURES_ALBUM_NAME } );
        
        
                    //await WriteMyFileStream(imageInCameraRoll.uri+'.temp.jpg', 'base64', false, base64ContentsWithInsertedMetadata);    
                    /*
                    await FileSystem.writeAsStringAsync(
                        imageInCameraRoll.uri+'.temp.jpg',
                        dataContentsWithInsertedMetadata.replace('data:image/'+fileExt+';base64,', ''),
                        {encoding: 'base64'}
                    );
                    await FileSystem.deleteAsync(imageInCameraRoll.uri, {idempotent: true});
                    */
        
                } catch (err){
                    ErrorAlert('Error: '+err.message, err);
                } finally {
                    try {
                        await FileSystem.deleteAsync(ImagePathTmp, {idempotent: true});
                    } catch (err) {
                        //ErrorAlert('Error: '+err.message, err);
                    } finally {
                        setAssets([]);
                        setIsProcessing(false);
                    }
                }
                        
            } else {  // Unchecked picture
                // Nothing to do
            }    
        }

        LogMe(1, 'processPictureChange(): Finished'); 

    } 

    useEffect( () => {  // This is executed when the component is reloaded
        async function didMount() { // Do not change the name of this function

            // Do stuff
            LogMe(1, 'useEffect of PPTagging invocation');  

            // https://stackoverflow.com/questions/38558200/react-setstate-not-updating-immediately
            // Warning: Despite not being formally an asynchronous function, setState is performed asynchronously
            // except if we access the state directly without its 'set' function and the value is a {} object:

        }

        didMount();  // If we want useEffect to be asynchronous, we have to define didMount as async and call it right after
        return async function didUnmount() { // Do not change the name of this function
          // Cleanup tasks
          LogMe(1, 'useEffect of PPTagging cleanup');
        };
    }, []);  // App.js does not have props

    async function ComponentRefresh() {  // Invoked every time this screen is loaded
        LogMe(1, 'Refreshing PPTagging Component');

        LogMe(1,JSON.stringify('propsState.AccountData.taggedPictures: '+JSON.stringify(propsState.AccountData.taggedPictures)));

        if (initStatus.key === 'init') {
            LogMe(1, 'Initialising PPTagging Component');
            initStatus.key = 'updated'; //update without rendering
            //initStatus({ key:'updated'}); //update with rendering
            // This will reach only on the first time the scren is loaded

            if (propsState.AccountData.firstrun) {

                await AsyncAlert(PARAM_WELCOME_MESSAGE);

                let cloneOfProps = {AccountData: propsState.AccountData};  // Force pass-by-value
                cloneOfProps.AccountData.firstrun = false;
        
                try {
                    await storage.save({
                        key: 'accountData', // Note: Do not use underscore("_") in key!
                        data: cloneOfProps.AccountData,
                    });
                } catch(error) { 
                    ErrorAlert(error.message, error);  // Storage error
                }
        
                setPropsState(cloneOfProps);    
            }


            LogMe(1, 'calling ExpoImagePicker.requestMediaLibraryPermissionsAsync()');
            let perms = await ExpoImagePicker.requestMediaLibraryPermissionsAsync(); 
            LogMe(1, 'ExpoImagePicker.requestMediaLibraryPermissionsAsync() result is: perms='+JSON.stringify(perms));
            if (perms.granted) {
                setImagePermissionsGranted(true);       
            } else {
                await AsyncAlert('The system indicates that you did not grant any privileges to access the pictures in the shared media library. This app needs this permission to operate. Please give the permissions by re-launching the app or by opening the system settings of your phone.');
            }    

            LogMe(1, 'Refreshing PPTagging Component - completed');
        }
    }

    // Initialisation
    ComponentRefresh();
    
    //We also load PPWrapComponent in the background to let it subscribe URL events when the app is already opened
    if (imagePermissionsGranted) {
        if (isProcessing) {
            return (
                <View style={styles.centercenterflex1}>
        
                    <View style={styles.headertitle}>
                        <Text style={styles.large}>Mark pictures as private</Text>
                    </View>
                    <View style={styles.centerleftflex1}>
                        <View style={styles.leftleft}>
                            <Text>       </Text>{/* Left margin */}
                        </View>
                        <View style={styles.centerleftflex1}>
                            <Text>{processingMessage}</Text>
                        </View>
                        <View style={styles.leftleft}>
                            <Text>       </Text>{/* Right margin */}
                        </View>
                    </View>
                    <TabsComponent activeTab="PPTagging" props={{propsState}} />
                </View>
            );
    
        } else {
            return (
                <View style={styles.centercenterflex1}>
        
                    <View style={styles.headertitle}>
                        <Text style={styles.large}>Mark pictures as private</Text>
                    </View>
                    <View style={styles.centerleftflex1}>
        
                        <ImagePicker
                            onSave={async(assets) => {
                                setAssets(assets)
                                LogMe(1, 'onSave: '+JSON.stringify(assets));
                                let cloneOfProps = {AccountData: propsState.AccountData};  // Force pass-by-value
                                cloneOfProps.AccountData.taggedPictures = assets;
                        
                                try {
                                    await storage.save({
                                        key: 'accountData', // Note: Do not use underscore("_") in key!
                                        data: cloneOfProps.AccountData,
                                    });
                                } catch(error) { 
                                    ErrorAlert(error.message, error);  // Storage error
                                }
                        
                                setPropsState(cloneOfProps);
                        
                            }}
                            onCancel={() => {
                            }}
                            onChange={async(image, checked) => {
                                LogMe(1, 'onChange');
                                await processPictureChange (image, checked);
                            }}
                            Albums
                            selected={assets}
                            multiple={false}
                            onSelectAlbum={(album) => {
                                LogMe(1,'PPTagging: User selected album: '+JSON.stringify(album));
                                setAlbum(album);
                                if (album?.title==PARAM_PRIVATE_PICTURES_ALBUM_NAME) {
                                    privateAlbumID.key = album?.id;
                                }
                            }}
                            selectedAlbum={album}                            
                        />
        
                    </View>
                    <TabsComponent activeTab="PPTagging" props={{propsState}} />
                </View>
            );    //selected={propsState.AccountData.taggedPictures}    
        }
    } else {
        return (
            <View style={styles.centercenterflex1}>
    
                <View style={styles.headertitle}>
                    <Text style={styles.large}>Mark pictures as private</Text>
                </View>
                <View style={styles.centerleftflex1}>
                    <View style={styles.leftleft}>
                        <Text>       </Text>{/* Left margin */}
                    </View>
                    <View style={styles.centerleftflex1}>
                        <Text>Awaiting user to grant permissions.</Text>
                    </View>
                    <View style={styles.leftleft}>
                        <Text>       </Text>{/* Right margin */}
                    </View>
                </View>
                <TabsComponent activeTab="PPTagging" props={{propsState}} />
            </View>
        );
    }

};
