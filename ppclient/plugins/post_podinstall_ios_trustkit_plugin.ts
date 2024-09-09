const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');

const { createRunOncePlugin, withInfoPlist } = require('expo/config-plugins');



const withInfoPlistPostPodinstallTKpatches = (config, id) => {
  return withInfoPlist(config, async(config) => {

    
  console.log('post_podinstall_ios_trustkit_plugin.ts started');



  // Modifications to the Podfile

  console.log('Adding TrustKit pod to the project');

  let PodfileOriginalContents = fs.readFileSync('ios/Podfile', {encoding: 'utf8'});

  if ( ! PodfileOriginalContents.includes('pod \'TrustKit\'')) {
    let PodfileModifiedContents = PodfileOriginalContents.replace(
      '  use_expo_modules!', 
      '  use_expo_modules!\n\n\
pod \'TrustKit\''
    );

    fs.writeFileSync('ios/Podfile', PodfileModifiedContents, {encoding: 'utf8'});

    //console.warn('PodfileModifiedContents:');
    //console.warn(PodfileModifiedContents);

  }


  console.log('Pod install');

  await exec('cd ios ; pod install');


  // Modifications to the TrustKit

  /**
   * WARNING: This modification makes SSL insecure by not verifying against the system trust store
   * It remains a question whether it checks the validity of the chained signatures - to be tested/checked!!
   */

  console.log('Modifications to ssl_pin_verifier.m');

  await exec('chmod u+w ios/Pods/TrustKit/TrustKit/Pinning/ssl_pin_verifier.m');

  let TKfileOriginalContents = fs.readFileSync('ios/Pods/TrustKit/TrustKit/Pinning/ssl_pin_verifier.m', {encoding: 'utf8'});

  if ( ! TKfileOriginalContents.includes('//return TSKTrustEvaluationFailedInvalidCertificateChain;')) {
    let TKfileModifiedContents = TKfileOriginalContents.replace('\
        CFRelease(serverTrust);\n\
        return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
\
', 
'\
        //CFRelease(serverTrust);\n\
        //return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
\
'
    );

    fs.writeFileSync('ios/Pods/TrustKit/TrustKit/Pinning/ssl_pin_verifier.m', TKfileModifiedContents, {encoding: 'utf8'});

    //console.warn('TKfileModifiedContents:');
    //console.warn(TKfileModifiedContents);

  }




  // Patch to default handler of SSL connections

  /**
   * WARNING: If you disable certificate pinning, you need to re-enable default SSL validation
   * by commenting this section, otherwise your SSL will be insecure!!
   */

    
  // FOR DEBUG (METRO) AND FOR PRODUCTION (IPA FILE)

  // Modifications TSKNSURLSessionDelegateProxy.m

  console.log('Modifications to TSKNSURLSessionDelegateProxy.m');

  await exec('chmod u+w ios/Pods/TrustKit/TrustKit/Swizzling/TSKNSURLSessionDelegateProxy.m');

  let NSURLOriginalContents = fs.readFileSync('ios/Pods/TrustKit/TrustKit/Swizzling/TSKNSURLSessionDelegateProxy.m', {encoding: 'utf8'});

  if (NSURLOriginalContents.includes('        completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, NULL);')) {
    let NSURLModifiedContents = NSURLOriginalContents.replace(/        completionHandler\(NSURLSessionAuthChallengePerformDefaultHandling, NULL\);/g, 
'\
        //completionHandler(NSURLSessionAuthChallengePerformDefaultHandling, NULL);\n\
        completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);\
'
    );

    fs.writeFileSync('ios/Pods/TrustKit/TrustKit/Swizzling/TSKNSURLSessionDelegateProxy.m', NSURLModifiedContents, {encoding: 'utf8'});



/*  
  // This works only for DEBUG (METRO ENVIRONMENT)

  // Modifications AppDelegate.mm

  let AppDelegateOriginalContents = fs.readFileSync('ios/ppclient/AppDelegate.mm', {encoding: 'utf8'});

  if ( ! AppDelegateOriginalContents.includes('@implementation RCTHTTPRequestHandler(MyPatchedSSL)')) {
    let AppDelegateModifiedContents = '\
#import "React/RCTBridgeModule.h"\n\
#import "React/RCTHTTPRequestHandler.h"\n\n\
' + AppDelegateOriginalContents + 
'\n\n\
#if DEBUG\n\
@implementation RCTHTTPRequestHandler(MyPatchedSSL)\n\
\n\
- (void)URLSession:(NSURLSession *)session didReceiveChallenge:(NSURLAuthenticationChallenge *)challenge completionHandler:(void (^)(NSURLSessionAuthChallengeDisposition disposition, NSURLCredential *credential))completionHandler\n\
{\n\
completionHandler(NSURLSessionAuthChallengeUseCredential, [NSURLCredential credentialForTrust:challenge.protectionSpace.serverTrust]);\n\
}\n\
@end\n\
#endif\n\
\n\
';

    fs.writeFileSync('ios/ppclient/AppDelegate.mm', AppDelegateModifiedContents, {encoding: 'utf8'});

*/


  }


  return config;
});
};

module.exports = createRunOncePlugin(
withInfoPlistPostPodinstallTKpatches,
'withInfoPlistPostPodinstallTKpatches',
'1.0.0'
);
