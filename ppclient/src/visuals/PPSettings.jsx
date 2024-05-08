//import { StatusBar } from 'expo-status-bar';
import React, {useState, useCallback, useEffect, useRef} from 'react';
import { StyleSheet, Button, Text, TextInput, View, Alert, ScrollView, Platform } from 'react-native';
import * as Device from 'expo-device';
import RNRestart from 'react-native-restart';  // Use only in PROD
import { DevSettings} from 'react-native';  // Use only in DEV

//import { useNavigation } from '@react-navigation/native';

import * as Integrity from 'expo-app-integrity';

import { TabsComponent } from './Tabs.jsx';

import { styles } from './myVisualsLibrary.jsx';
import { EraseLocalData, ErrorAlert, LogMe, UpdateLogMeUsername } from '../myGeneralLibrary.jsx';

import storage from '../storage/storageApi.js';

import { ApiTestNetworkConnection } from '../network/networkApi.js';






export const PPSettingsComponent = ({ route, navigation }) => {

    const [initStatus, setInitStatus] = useState({ key: 'init' });
    const [networkStatus, setNetworkStatus] = useState('(press button)');
    const [propsState, setPropsState] = useState(route.params);

    useEffect( () => {  // This is executed when the component is reloaded
        async function didMount() { // Do not change the name of this function
            // Do stuff
            LogMe(1, 'useEffect of PPSettings invocation');           
        }
        didMount();  // If we want useEffect to be asynchronous, we have to define didMount as async and call it right after
        return async function didUnmount() { // Do not change the name of this function
          // Cleanup tasks
          LogMe(1, 'useEffect of PPSettings cleanup');
        };
    }, []);  // App.js does not have props


    async function ComponentRefresh() {  // Invoked every time this screen is loaded
        LogMe(1, 'Refreshing PPSettings Component');
        if (initStatus.key === 'init') {
            LogMe(1, 'Initialising PPSettings Component');
            initStatus.key = 'updated'; //update without rendering
            //initStatus({ key:'updated'}); //update with rendering
            // This will reach only on the first time the scren is loaded
        }
    }
    

    async function HandlerForLocalDataEraseFromSettings() {
        LogMe(1, 'HandlerForLocalDataEraseFromSettings()');
        try {
            //setCurrentScreenInMainComponent('PPReload');                    
            //setCurrentScreenInMainComponent('Register');  
            navigation.navigate('PPReload');
            await EraseLocalData();
            if (__DEV__) {
                DevSettings.reload(); // Only in DEV
            } else {
                RNRestart.restart();  // Only in PROD
            }
                  
        } catch(error) {
            //console.error(error);
            ErrorAlert(error.message, error);  // Some error
        }         
    }


    async function EraseAllServerData() {
        LogMe(1, 'EraseAllServerData()');
        Alert.alert('Confirmation', 'All user data on the server side, as well as the app\'s local data, will be erased. All other client apps will have to be restarted. Are you sure you want to continue?', [
          {
            text: 'Cancel',
            //onPress: () => ,
            style: 'cancel',
          },
          {
            text: 'OK', onPress: async () => 
                {
                    try {
                        let res = await ApiResetFactoryDB();
                        if (!res.isSuccessful) {
                            ErrorAlert('An error has occurred on the server. Check the server and try again.');  // Network error
                        } else {
                            await HandlerForLocalDataEraseFromSettings();                    
                        }
                    } catch(error) {
                        //console.error(error);
                        ErrorAlert(error.message, error);  // Network error
                    }        
                },
          },
        ]);    
    }


    
    async function EraseLocalUserData() {
        Alert.alert('Confirmation', 'All your local data will be wiped. You will lose the data of all private pictures received so far. Are you sure you want to continue?', [
          {
            text: 'Cancel',
            //onPress: () => ,
            style: 'cancel',
          },
          {
            text: 'OK', onPress: async () => 
                {
                    await HandlerForLocalDataEraseFromSettings();        
                },
          },
        ]);
    }


    async function SaveUsername(newusername) {
        let cloneOfProps = {AccountData: propsState.AccountData};  // Force pass-by-value
        cloneOfProps.AccountData.username = newusername;

        try {
            await storage.save({
                key: 'accountData', // Note: Do not use underscore("_") in key!
                data: cloneOfProps.AccountData,
            });
        } catch(error) { 
            ErrorAlert(error.message, error);  // Storage error
        }

        setPropsState(cloneOfProps);
        
        UpdateLogMeUsername(newusername);
    }    


    async function CheckPPServer() {
        setNetworkStatus('Running test...');
        try {
            await ApiTestNetworkConnection();
        } catch(error) {
            //console.error(error);
            ErrorAlert("Error when sending application-level ping to the server", error);  // Network error
            setNetworkStatus('DOWN');
            return;
        }
        setNetworkStatus('OK');
    }


    // Initialisation
    ComponentRefresh();
    
    
    return (
        <View style={styles.centercenterflex1}>
            <View style={styles.headertitle}>
                <Text style={styles.large}>System info and settings</Text>
            </View>
            <View style={styles.centerleftflex1}>
                <View style={styles.leftleft}>
                    <Text>       </Text>{/* Left margin */}
                </View>
                <View style={styles.centerleftflex1}>
                    <ScrollView style={styles.scrollView}>{/* ScrollView already expands, so we set their children not to expand, otherwise the buttons expand */}

                        <View style={styles.leftleft}>
                            <Text style={{fontWeight: "bold"}}>Username is: </Text>
                            <TextInput
                                style={styles.textfield}
                                onChangeText={newText => SaveUsername(newText)}
                                defaultValue={propsState.AccountData.username}
                            />
                        </View>
                        <View style={styles.leftleft}>
                            <Text>Used only for debugging.</Text>
                        </View>

                        <Text />

                        <View style={styles.leftleft}>
                            <Button title='Check PP server connection' onPress={() => CheckPPServer()} />
                        </View>

                        <View style={styles.leftleft}>
                            <Text>Network connection to PP server is: </Text><Text style={{fontWeight: "bold"}}>{ networkStatus }</Text>
                        </View>

                        <Text />

                        <View style={styles.leftleft}>
                            <Text style={{fontWeight: "bold"}}>Is this a physical device? {Device.isDevice ? 'Yes' : 'No'}</Text>
                        </View>
                        <View style={styles.leftleft}>
                        <Text>Corresponds to Device.isDevice.</Text>
                        </View>

                        <Text />

                        <View style={styles.leftleft}>
                            <Text style={{fontWeight: "bold"}}>Platform OS is: {Platform.OS}</Text>
                        </View>
                        <View style={styles.leftleft}>
                        <Text>Corresponds to Platform.OS.</Text>
                        </View>

                        <Text />

                        <View style={styles.leftleft}>
                            <Text style={{fontWeight: "bold"}}>Platform version is: {Platform.Version}</Text>
                        </View>
                        <View style={styles.leftleft}>
                        <Text>Corresponds to Platform.Version.</Text>
                        </View>

                        <Text />
                        <View style={styles.leftleft}>
                            <Text style={{fontWeight: "bold"}}>Is this a development environment? {__DEV__ ? 'Yes' : 'No'}</Text>
                        </View>

                        <View style={styles.leftleft}>
                        <Text>Corresponds to __DEV__.</Text>
                        </View>
                        <View style={styles.leftleft}>
                        <Text>Used to trigger the appropriate app reload function. In Expo Go (say, development) we use DevSettings.reload(), whereas in the bare React Native app we use RNRestart.restart().</Text>
                        </View>

                        <Text />

                        <View style={styles.leftleft}>
                            <Button title='Erase PP user data on this device' onPress={() => EraseLocalUserData()} />
                        </View>

                        <Text />

                    </ScrollView>
                </View>
                <View style={styles.leftleft}>
                    <Text>       </Text>{/* Right margin */}
                </View>
            </View>
            <TabsComponent activeTab="PPSettings" props={{propsState}} />
        </View>
    );
};
