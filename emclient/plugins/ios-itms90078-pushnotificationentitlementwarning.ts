const { createRunOncePlugin, withInfoPlist } = require('expo/config-plugins');



const withInfoPlistPushNotificationEntitlement = (config, id) => {
  return withInfoPlist(config, async(config) => {

    const fs = require('fs');
    



    // Modifications AppDelegate.mm

    let AppDelegateOriginalContents = fs.readFileSync('ios/ppclient/AppDelegate.mm', {encoding: 'utf8'});

    let AppDelegateModifiedContents = AppDelegateOriginalContents;
    
    AppDelegateModifiedContents = AppDelegateModifiedContents.replace('- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken\n\
{\n\
  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];\n\
}\n\
', '// *** This has been commented by ios-itms90078-pushnotificationentitlementwarning.ts plugin\n\
//- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken\n\
//{\n\
//  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];\n\
//}\n\
'
    );

    AppDelegateModifiedContents = AppDelegateModifiedContents.replace('- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error\n\
{\n\
  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];\n\
}\n\
', '// *** This has been commented by ios-itms90078-pushnotificationentitlementwarning.ts plugin\n\
//- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error\n\
//{\n\
//  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];\n\
//}\n\
'
    );

    AppDelegateModifiedContents = AppDelegateModifiedContents.replace('- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler\n\
{\n\
  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];\n\
}\n\
', '// *** This has been commented by ios-itms90078-pushnotificationentitlementwarning.ts plugin\n\
//- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler\n\
//{\n\
//  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];\n\
//}\n\
'
    );


    fs.writeFileSync('ios/ppclient/AppDelegate.mm', AppDelegateModifiedContents, {encoding: 'utf8'});
  
    console.warn('AppDelegateModifiedContents:');
    console.warn(AppDelegateModifiedContents);
  



    return config;
  });
};

module.exports = createRunOncePlugin(
  withInfoPlistPushNotificationEntitlement,
  'withInfoPlistPushNotificationEntitlement',
  '1.0.0'
);

// https://stackoverflow.com/questions/72171458/how-to-add-values-to-app-json-for-android-in-expo-managed-workflow
// https://stackoverflow.com/questions/75013370/create-a-expo-config-plugin-file-to-modify-android-manifest
