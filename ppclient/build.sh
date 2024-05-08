appname="pt.lasige.ppclient"
artifactname="ppclient"
mainactivity="MainActivity"


# Clear screen
clear


echo "========================================================================================="
echo "NOTE: If you switch from/to an EAS build (AAB/APK) to/from a bare workflow, "
echo "remember to first uninstall the app, otherwise you will get a signature mismatch error."
echo "========================================================================================="


# Check parameters
if [ "$1" != "apk" ] && [ "$1" != "aab" ] && [ "$1" != "bare" ]; then
    echo "The first parameter is the build type, and must be either 'apk', 'aab', or 'bare'."
    exit 1
fi
if [ "$2" != "major" ] && [ "$2" != "minor" ] && [ "$2" != "patch" ]; then
    echo "The second parameter must be either 'major', 'minor', or 'patch'."
    exit 1
fi


echo "Running build: $1 on $appname"


# For the user to check connected devices on-screen
echo "Connected and recognized devices to the the ADB service:"
adb devices
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "adb devices ..."
    exit $RESULT
fi


# In case we made changes to the app-integrity-android-standard module (remember to upstream changes within app-integrity-android-standard, first)
echo "Updating app-integrity-android-standard module to the latest version"
npm update app-integrity-android-standard
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "npm update ..."
    exit $RESULT
fi



# Clear previous builds
if [ "$1" = "aab" ]; then
    rm -f ./*.aab
    echo "Old AABs deleted"
fi
if [ "$1" = "apk" ]; then
    rm -f ./*.apk
    echo "Old APKs deleted"
fi

if [ "$3" = "savepatches" ]; then
    echo "Updating patch files with the latest changes"
    echo "Check: https://github.com/ds300/patch-package#readme"
    rm -r ./patches/*
    npx patch-package png-metadata --exclude "^dummy\$" --include "^lib/png-metadata\\.js\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package expo-image-multiple-picker --exclude "^dummy\$" --include "^lib/index\\.js\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package react-native-blob-util --exclude "^dummy\$" --include "^android/src/|^class/"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package expo-app-integrity --exclude "^dummy\$" --include "^android/|^ios/"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package expo-device --exclude "^dummy\$" --include "^android/build\\.gradle\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package expo-secure-store --exclude "^dummy\$" --include "^android/build\\.gradle\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
fi
if [ "$3" != "savepatches" ]; then
echo
echo "/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-"
echo "/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-"
echo "/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-"
echo "NOTE: This is not a development environment for $artifactname"
echo "/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-"
echo "/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-"
echo "/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-/-"
echo
fi


echo "Linking/Unlinking static assets"
npx react-native-asset
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "react-native-asset ..."
    exit $RESULT
fi


echo "Stopping any current app execution on the phone"
adb shell am force-stop $appname


echo "Dummy commit"
git add .
git commit -m "Dummy commit"


echo "Incrementing version: $2"
npm version $2 --no-git-tag-version
./increment_version_app_json.sh $2


echo "Dummy commit"
git add .
git commit -m "Dummy commit"


echo "Prebuild cleanup"
npx expo prebuild --clean
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "npx expo prebuild ..."
    exit $RESULT
fi

echo "Applying patches of patch-package"
# Needs to be called *after* the 'npx expo prebuild --clean'
npx patch-package
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "npx expo prebuild ..."
    exit $RESULT
fi


echo "Adjusting JVM memory settings"
"./plugins/jvmmemory.sh"
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "./plugins/jvmmemory.sh"
    exit $RESULT
fi


echo "Running the build!"
if [ "$1" = "aab" ]; then
    eas build -p android --profile previewaab --local
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "eas build ..."
        exit $RESULT
    fi
fi
if [ "$1" = "apk" ]; then
    eas build -p android --profile preview --local
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "eas build ..."
        exit $RESULT
    fi
fi
if [ "$1" = "bare" ]; then
    npx expo run:android --port 8082
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx expo ..."
        exit $RESULT
    fi
fi


#Rename artifacts
if [ "$1" = "aab" ]; then
    mv *.aab "$artifactname.aab"
    echo "Artifact renamed to $artifactname.aab"
fi
if [ "$1" = "apk" ]; then
    mv *.apk "$artifactname.apk"
    echo "Artifact renamed to $artifactname.apk"
fi


# Install and run APK
if [ "$1" = "apk" ]; then

    #echo "Uninstalling previous instance"
    #adb uninstall $appname
    # Result is not monitored, as previous install might have been uninstalled manually

    echo "Installing APK onto the device"
    adb install ./$artifactname.apk
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "adb install ..."
        exit $RESULT
    fi

    echo "Running APK onto the device"
    adb shell am start -n $appname/$appname.$mainactivity
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "adb shell am start ..."
        exit $RESULT
    fi

    # See logs
    react-native log-android
    
fi



