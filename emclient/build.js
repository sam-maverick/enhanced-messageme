#!/usr/bin/env node
require('shelljs/global');

require('./params_build.js');

const cp = require('child_process');

function myExec(command) {
  cp.execSync(command, { stdio: 'inherit' });
}

// Clear screen
myExec('clear');

echo('NODE_PATH=' + env.NODE_PATH);
echo('EAS_NO_VCS=' + env.EAS_NO_VCS);

echo('=========================================================================================');
echo('NOTE: If you switch from/to an EAS build (AAB/APK) to/from a bare workflow, ');
echo('remember to first uninstall the app, otherwise you will get a signature mismatch error.');
echo('=========================================================================================');

echo();

echo('=========================================================================================');
echo('NOTE: You need to Ctrl+C and re-run this script to apply changes made to the OS Update layer');
echo('or to non-jsx files after the app is running');
echo('=========================================================================================');

echo();



// Check parameters and compatibilities
/*
if (process.argv[2] === 'bare' && artifactname === 'ppimagemarker') {
  echo('ERROR: The bare build is not supported with ppimagemarker. Functional anomalies have been detected with the expo-image-multiple-picker: It never finishes loading pictures. Use the APK/AAB build instead.');
  exit(1);
}*/

if (process.argv[2] !== 'apk' && process.argv[2] !== 'aab' && process.argv[2] !== 'bare') {
  echo('The first parameter is the build type, and must be either \'apk\', \'aab\', or \'bare\'.');
  exit(1);
}
if (process.argv[3] !== 'major' && process.argv[3] !== 'minor' && process.argv[3] !== 'patch') {
  echo('The second parameter must be either \'major\', \'minor\', or \'patch\'.');
  exit(1);
}


echo('Running build: ' + process.argv[2] + ' on ' + appname);


// For the user to check connected devices on-screen
echo('Connected and recognized devices to the the ADB service:');
myExec('adb devices');
env.RESULT = error();
if (env.RESULT.toString() !== 'null') {
  echo('Aborting on ' + env.RESULT + ', command failed:');
  echo('adb devices ...');
  exit(1);
}

if (artifactname === 'ppclient') {
  require('./compile_assets.js');
}

// Clear previous builds
if (process.argv[2] === 'aab') {
  rm('-f', './*.aab');
  echo('Old AABs deleted');
}
if (process.argv[2] === 'apk') {
  rm('-f', './*.apk');
  echo('Old APKs deleted');
}

if (process.argv[4] === 'savepatches') {
  require('./savepatches.js');
  echo('Finished saving patches');
}
if (process.argv[4] !== 'savepatches') {
  echo();
  echo('/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-');
  echo('/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-');
  echo('/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-');
  echo('NOTE: This is not a development environment for ' + artifactname);
  echo('/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-');
  echo('/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-');
  echo('/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-');
  echo();
}

if (artifactname === 'ppclient') {
  // In case we made changes to the app-integrity-android-standard module (remember to upstream changes within app-integrity-android-standard, first)
  echo('Updating app-integrity-android-standard module to the latest version');
  myExec('yarn add app-integrity-android-standard');
  env.RESULT = error();
  if (env.RESULT.toString() !== 'null') {
    echo('Aborting on ' + env.RESULT + ', command failed:');
    echo('yarn add ...');
    exit(1);
  }
}

if (process.argv[2] !== 'aab') {
  echo('Stopping any current app execution on the phone');
  myExec(`adb shell am force-stop ${appname}`);
}

echo('Incrementing version: ' + process.argv[3]);
myExec(`yarn config set version-git-tag false`);
myExec(`yarn version --${process.argv[3]}`);
//myExec(`node ./increment_version_app_json.js ${process.argv[3]}`);
require('./increment_version_app_json.js')(process.argv[3]);


//echo "Dummy commit"
//if [ -d ".git" ]; then
//  # Take action if $DIR exists. #
//    git add .
//    git commit -m "Dummy commit"
//fi


echo('Deleting android folder');
rm('-r', './android/');
echo('Deleting ios folder');
rm('-r', './ios/');


echo('Prebuild cleanup');
myExec('npx expo prebuild');
env.RESULT = error();
if (env.RESULT.toString() !== 'null') {
  echo('Aborting on ' + env.RESULT + ', command failed:');
  echo('npx expo prebuild ...');
  exit(1);
}

//echo "Applying patches of patch-package"
//# Needs to be called *after* the 'npx expo prebuild --clean'
//npx patch-package
//RESULT=$?
//if [ $RESULT != 0 ]; then
//    echo "Aborting on $RESULT, command failed:"
//    echo "npx expo prebuild ..."
//    exit $RESULT
//fi


if (artifactname === 'ppclient') {
  echo('Linking/Unlinking static assets');
  // Old; it does not support reading files
  //npx react-native-asset
  myExec('react-native-asset');
  env.RESULT = error();
  if (env.RESULT.toString() !== 'null') {
    echo('Aborting on ' + env.RESULT + ', command failed:');
    echo('react-native-asset ...');
    exit(1);
  }
}


echo('Running the build!');
if (process.argv[2] === 'aab') {
  myExec('eas build -p android --profile previewaab --local');
  env.RESULT = error();
  if (env.RESULT.toString() !== 'null') {
    echo('Aborting on ' + env.RESULT + ', command failed:');
    echo('eas build ...');
    exit(1);
  }
}
if (process.argv[2] === 'apk') {
  myExec('eas build -p android --profile preview --local');
  env.RESULT = error();
  if (env.RESULT.toString() !== 'null') {
    echo('Aborting on ' + env.RESULT + ', command failed:');
    echo('eas build ...');
    exit(1);
  }
}
// If we call "npx expo run:android" directly, the package.json scripts are not checked
// We need to invoke the npm script of package.json, which in turn will invoke "npx expo run:android"
if (process.argv[2] === 'bare') {
  if (artifactname === 'ppclient') {
    myExec('npx expo run:android --port 8082');
    env.RESULT = error();
    if (env.RESULT.toString() !== 'null') {
      echo('Aborting on ' + env.RESULT + ', command failed:');
      echo('npx expo ...');
      exit(1);
    }
  } else if (artifactname === 'ppimagemarker') {
    myExec('npx expo run:android --port 8083');
    env.RESULT = error();
    if (env.RESULT.toString() !== 'null') {
      echo('Aborting on ' + env.RESULT + ', command failed:');
      echo('npx expo ...');
      exit(1);
    }
  } else {
    myExec('npm run android -c');
    env.RESULT = error();
    if (env.RESULT.toString() !== 'null') {
      echo('Aborting on ' + env.RESULT + ', command failed:');
      echo('npm run ...');
      exit(1);
    }
  }
}


//Rename artifacts
if (process.argv[2] === 'aab') {
  mv('*.aab', artifactname + '.aab');
  echo('Artifact renamed to ' + artifactname + '.aab');
}
if (process.argv[2] === 'apk') {
  mv('*.apk', artifactname + '.apk');
  echo('Artifact renamed to ' + artifactname + '.apk');
}


// Install and run APK
if (process.argv[2] === 'apk') {
  //echo "Uninstalling previous instance"
  //adb uninstall $appname
  // Result is not monitored, as previous install might have been uninstalled manually
  
  echo('Installing APK onto the device');
  myExec(`adb install ./${artifactname}.apk`);
  env.RESULT = error();
  if (env.RESULT.toString() !== 'null') {
    echo('Aborting on ' + env.RESULT + ', command failed:');
    echo('adb install ...');
    exit(1);
  }
  
  echo('Running APK onto the device');
  myExec(`adb shell am start -n ${appname}/${appname}.${mainactivity}`);
  env.RESULT = error();
  if (env.RESULT.toString() !== 'null') {
    echo('Aborting on ' + env.RESULT + ', command failed:');
    echo('adb shell am start ...');
    exit(1);
  }
  
  // See logs
  myExec('react-native log-android');
  
}
