
const { XML, createRunOncePlugin, withAndroidManifest } = require('@expo/config-plugins');
const { mkdirSync } = require("fs");

const withAndroidManifestFileProviderConfigurations = config => {
  return withAndroidManifest(config, async (config) => {

    // modify manifest
    
    console.warn('withAndroidManifestFileProviderConfigurations started');

    const manifest = config.modResults.manifest;

    manifest.$ = {
      ...manifest.$,
      'xmlns:tools': 'http://schemas.android.com/tools',
    };

    // Check if there are any application tags
    if (!Array.isArray(manifest['application'])) {
      console.warn('withAndroidManifestFileProviderConfigurations: No application array in manifest?');
      return manifest;
    }
  
    // Find the "application" called ".MainApplication"
    let application = manifest['application'].find(
      (item) => item.$['android:name'] === '.MainApplication'
    );
    if (!application) {
      console.warn('withAndroidManifestFileProviderConfigurations: No .MainApplication?');
      return manifest;
    }

    const providertagcontents = {
        $: {
            'android:name': 'com.artirigo.fileprovider.MyFileProvider',
            'android:authorities': 'pt.lasige.safex.enhmessageme.MyFileProvider',
            'android:grantUriPermissions': 'true',
            'android:exported': 'false',
        },
        'meta-data': {
            $: {
                'android:name': 'android.support.FILE_PROVIDER_PATHS',
                'android:resource': '@xml/filepaths',
            }
        }
    }

    application['provider'] = providertagcontents;


    // create file_paths.xml
    const dir = "android/app/src/main/res/xml";

    const filepathscontents = {
      'paths': {
        $: {
          'xmlns:android': 'http://schemas.android.com/apk/res/android',
        },
        'files-path': {
          $: {
            'name': 'ppimg',
            'path': 'ppSharedImages/',
          }
        }
      }
    }

    mkdirSync(dir, { recursive: true });
    await XML.writeXMLAsync({ path: `${dir}/filepaths.xml`, xml: filepathscontents });


    // return result

    return config;
  });
};

module.exports = createRunOncePlugin(
  withAndroidManifestFileProviderConfigurations,
  'withAndroidManifestFileProviderConfigurations',
  '1.0.0'
);

