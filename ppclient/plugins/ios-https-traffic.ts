const { createRunOncePlugin, withInfoPlist } = require('expo/config-plugins');



const withInfoPlistHttpConfigurations = (config, id) => {
  return withInfoPlist(config, async(config) => {

    const fs = require('fs');
/*

    // Check: ../src/parameters
    const PARAM_SERVER_HOSTNAME = 'ppserver-gen.localnet';




    // Get SHA256 hash of the public key of the CA, in BASE64format

    const pubkey256hashb64 = fs.readFileSync('assets/custom/ca_cert_pubkey_sha256_base64.txt', {encoding: 'utf8'});

    console.warn('(--)(--)(--)(--)(--)(--)(--)(--)(--)(--)(--)');
    console.warn('pubkey256hashb64=--'+pubkey256hashb64+'--');
    



    // Modifications to the Podfile

    let PodfileOriginalContents = fs.readFileSync('ios/Podfile', {encoding: 'utf8'});

    if ( ! PodfileOriginalContents.includes('pod \'TrustKit\'')) {
      let PodfileModifiedContents = PodfileOriginalContents.replace(
        '  use_expo_modules!', 
        '  use_expo_modules!\n\n\
  pod \'TrustKit\''
      );
  
      fs.writeFileSync('ios/Podfile', PodfileModifiedContents, {encoding: 'utf8'});
  
      console.warn('PodfileModifiedContents:');
      console.warn(PodfileModifiedContents);
  
    }




    // Modifications AppDelegate.mm

    let AppDelegateOriginalContents = fs.readFileSync('ios/ppclient/AppDelegate.mm', {encoding: 'utf8'});

    if ( ! AppDelegateOriginalContents.includes('kTSKPinnedDomains: @{')) {
      let AppDelegateModifiedContents = AppDelegateOriginalContents.replace('  self.moduleName = @"main";', '\
  NSDictionary *trustKitConfig =\n\
  @{\n\
    kTSKSwizzleNetworkDelegates: @YES,\n\
    kTSKPinnedDomains: @{\n\
        @"' + PARAM_SERVER_HOSTNAME + '" : @{\n\
            kTSKIncludeSubdomains: @YES,\n\
            kTSKEnforcePinning: @YES,\n\
            kTSKDisableDefaultReportUri: @YES,\n\
            kTSKPublicKeyHashes : @[\n\
              @"' + pubkey256hashb64 + '",\n\
              @"' + pubkey256hashb64 + '",\n\
            ],\n\
        },\n\
    }};\n\
  [TrustKit initSharedInstanceWithConfiguration:trustKitConfig];\n\n\
  self.moduleName = @"main";'
      );

      AppDelegateModifiedContents = AppDelegateModifiedContents.replace('#import <React/RCTLinkingManager.h>','\
#import <React/RCTLinkingManager.h>\n\
#import <TrustKit/TrustKit.h>'
      );

      fs.writeFileSync('ios/ppclient/AppDelegate.mm', AppDelegateModifiedContents, {encoding: 'utf8'});
  
      //console.warn('AppDelegateModifiedContents:');
      //console.warn(AppDelegateModifiedContents);
  
    }

*/
    return config;
  });
};

module.exports = createRunOncePlugin(
  withInfoPlistHttpConfigurations,
  'withInfoPlistHttpConfigurations',
  '1.0.0'
);

// https://stackoverflow.com/questions/72171458/how-to-add-values-to-app-json-for-android-in-expo-managed-workflow
// https://stackoverflow.com/questions/75013370/create-a-expo-config-plugin-file-to-modify-android-manifest
