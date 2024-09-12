const { createRunOncePlugin, withInfoPlist } = require('expo/config-plugins');



const withInfoPlistPushNotificationEntitlement = (config, id) => {
  return withInfoPlist(config, async(config) => {

    console.warn('withInfoPlistPushNotificationEntitlement started');

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

    if ( ! AppDelegateModifiedContents.includes('//  return [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];')) {
      console.warn('We expected the patch to be applied or to be already present (1).');
      process.exit(1);
    }

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

    if ( ! AppDelegateModifiedContents.includes('//  return [super application:application didFailToRegisterForRemoteNotificationsWithError:error];')) {
      console.warn('We expected the patch to be applied or to be already present (2).');
      process.exit(1);
    }

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

    if ( ! AppDelegateModifiedContents.includes('//  return [super application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];')) {
      console.warn('We expected the patch to be applied or to be already present (3).');
      process.exit(1);
    }
    
    fs.writeFileSync('ios/ppclient/AppDelegate.mm', AppDelegateModifiedContents, {encoding: 'utf8'});
  
    //console.warn('AppDelegateModifiedContents:');
    //console.warn(AppDelegateModifiedContents);
  



    return config;
  });
};

module.exports = createRunOncePlugin(
  withInfoPlistPushNotificationEntitlement,
  'withInfoPlistPushNotificationEntitlement',
  '1.0.0'
);

