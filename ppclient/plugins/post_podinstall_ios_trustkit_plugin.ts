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
    if ((trustResult != kSecTrustResultUnspecified) && (trustResult != kSecTrustResultProceed))\n\
    {\n\
        // Default SSL validation failed\n\
        CFDictionaryRef evaluationDetails = SecTrustCopyResult(serverTrust);\n\
        TSKLog(@"Error: default SSL validation failed for %@: %@", serverHostname, evaluationDetails);\n\
        CFRelease(evaluationDetails);\n\
        CFRelease(serverTrust);\n\
        return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
    }\n\
\
'
, 
'\
    if ((trustResult != kSecTrustResultUnspecified) && (trustResult != kSecTrustResultProceed))\n\
    {\n\
        // Default SSL validation failed\n\
        CFDictionaryRef evaluationDetails = SecTrustCopyResult(serverTrust);\n\
        TSKLog(@"Error: default SSL validation failed for %@: %@", serverHostname, evaluationDetails);\n\
        TSKLog(@"Now checking if this a recoverable error");\n\
        \n\
        CFStringRef key = CFSTR("TrustResultDetails");\n\
        CFTypeRef value = CFSTR("key not found");\n\
        \n\
        NSString *keyString = (__bridge NSString *)key;\n\
        //NSDictionary *settings = (__bridge NSDictionary *)evaluationDetails;\n\
        //TSKLog(@"valueForKey: %@ inDict: %@ value: %@",keyString,settings,settings[keyString]);\n\
\n\
        Boolean AnchorTrustedIssueFound = false;\n\
        if (CFDictionaryGetValueIfPresent(evaluationDetails, key, &value)) {\n\
            NSString *valueString = (__bridge NSString *)value;\n\
            NSArray *valueArray = (NSArray *)valueString; // Internal type seems to be NSCFArray\n\
            for (id object in valueArray) {\n\
                // do something with object\n\
                NSDictionary *trustResultDetailsDic = (NSDictionary *) object; // Internal type seems to be NSCFDictionary\n\
                NSString *TRDkey;\n\
               for(TRDkey in trustResultDetailsDic){\n\
                   if ([TRDkey isEqualToString:@"AnchorTrusted"] && [trustResultDetailsDic objectForKey: TRDkey]) {\n\
                       TSKLog(@"Acceptable: AnchorTrusted = 0");\n\
                       AnchorTrustedIssueFound = true;\n\
                   } else {\n\
                       TSKLog(@"Error: Found unacceptable SSL validation issue in trust result details: Key: %@, Value: %@", TRDkey, [trustResultDetailsDic objectForKey: TRDkey]);\n\
                       CFRelease(evaluationDetails);\n\
                       CFRelease(serverTrust);\n\
                       return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
                   }\n\
               }\n\
            }\n\
        } else {\n\
            TSKLog(@"Error: Key not found in evaluation details: %@", keyString);\n\
            CFRelease(evaluationDetails);\n\
            CFRelease(serverTrust);\n\
            return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
        }\n\
        \n\
        if (! AnchorTrustedIssueFound) {\n\
            TSKLog(@"Error: Inconsistency; An SSL issue was raised but no details were given by the evaluation library. This might indicate that the library specifications have changed. We expected to find AnchorTrusted = 0");\n\
            CFRelease(evaluationDetails);\n\
            CFRelease(serverTrust);\n\
            return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
        }\n\
\n\
        //CFRelease(evaluationDetails);\n\
        //CFRelease(serverTrust);\n\
        //return TSKTrustEvaluationFailedInvalidCertificateChain;\n\
    }\n\
\
'
    );

    //https://forums.developer.apple.com/forums/thread/50441

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

  // https://medium.com/@rushitjivani/how-to-ignore-ssl-for-react-native-android-ios-4942e10ea667

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
