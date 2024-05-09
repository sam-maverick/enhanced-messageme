appname="pt.lasige.enhmessageme"
artifactname="enhmessageme"
mainactivity="MainActivity"


# Clear screen
clear


echo "========================================================================================="
echo "NOTE: If you switch from/to an EAS build (AAB/APK) to/from a bare workflow, "
echo "remember to first uninstall the app, otherwise you will get a signature mismatch error."
echo "========================================================================================="

echo

echo "========================================================================================="
echo "NOTE: You need to Ctrl+C and re-run this script to apply changes made to the OS Update layer after the app is running"
echo "========================================================================================="

echo

#echo "========================================================================================="
#echo "WARNING. If you delete the node_modules directory and do a 'npm install', do a 'npx patch-package' before"
#echo "this build.sh script if you run it with the savepatches option, otherwise you will lose your prior changes!!"
#echo "========================================================================================="
#
#echo
# Post-NOTE: This is not necessary any more, as the post-install option of package.json takes care of that

echo "========================================================================================="
echo "NOTE: Make sure that the versions in package.json are set to exact to those packages that are patched, e.g., expo-file-system"
echo "========================================================================================="

echo

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
if [ "$3" = "savepatches" ]; then
echo "This is an emclient development build."
fi


# For the user to check connected devices on-screen
echo "Connected and recognized devices to the the ADB service:"
adb devices
RESULT=$?
if [ $RESULT != 0 ]; then
    echo "Aborting on $RESULT, command failed:"
    echo "adb devices ..."
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
    echo "Updating patch file of expo-file-system with the latest changes"
echo "========================================================================================="
echo "NOTE: Do not interrupt util finished saving patches"
echo "========================================================================================="
    echo "We include package.json (by default it is excluded), and we exclude the build dir"
    echo "Check: https://github.com/ds300/patch-package#readme"
    rm -r ./patches/*
    npx patch-package png-metadata --exclude "^dummy\$" --include "^lib/png-metadata\\.js\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package expo-file-system --exclude "^dummy\$" --include "^tsconfig\\.json\$|^package\\.json\$|^src/"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    echo "Updating patch files of other modules with the latest changes"
    npx patch-package react-native-lightbox-v2 --exclude "^dummy\$" --include "^dist/"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package cipher-base --use-yarn --exclude "^dummy\$" --include "^index\\.js\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package hash-base --use-yarn --exclude "^dummy\$" --include "^index\\.js\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package react-native-app-link --exclude "^dummy\$" --include "^index\\.js\$"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package react-native-file-provider --exclude "^dummy\$" --include "^android/build\\.gradle\$|^android/src"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    npx patch-package react-native-send-intent --exclude "^dummy\$" --include "^android/src"
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npx patch-package ..."
        exit $RESULT
    fi
    
    echo "Finished saving patches"
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

#echo "Applying patches of patch-package"
# Needs to be called *after* the 'npx expo prebuild --clean'
#npx patch-package
#RESULT=$?
#if [ $RESULT != 0 ]; then
#    echo "Aborting on $RESULT, command failed:"
#    echo "npx expo prebuild ..."
#    exit $RESULT
#fi

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
# If we call "npx expo run:android" directly, the package.json scripts are not checked
# We need to invoke the npm script of package.json, which in turn will invoke "npx expo run:android"
if [ "$1" = "bare" ]; then
    npm run android
    RESULT=$?
    if [ $RESULT != 0 ]; then
        echo "Aborting on $RESULT, command failed:"
        echo "npm run ..."
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



