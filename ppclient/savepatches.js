#!/usr/bin/env node
require('shelljs/global');

echo('Updating patch files with the latest changes');
echo('=========================================================================================');
echo('NOTE: Do not interrupt util finished saving patches');
echo('=========================================================================================');
echo('Check: https://github.com/ds300/patch-package#readme');
//rm('-r', './patches/*');
exec('npx patch-package cipher-base --use-yarn --exclude "^dummy\\$" --include "^index\\\\.js\\$"');
exec('npx patch-package hash-base --use-yarn --exclude "^dummy\\$" --include "^index\\\\.js\\$"');
exec('npx patch-package png-metadata --exclude "^dummy\\$" --include "^lib/png-metadata\\\\.js\\$"');
exec('npx patch-package expo-app-integrity --exclude "^dummy\\$" --include "^android/build\\\\.gradle\\$|^ios/"');
exec('npx patch-package react-native-blob-util --exclude "^dummy\\$" --include "^android/src/|^class/"');
exec('npx patch-package expo-device --exclude "^dummy\\$" --include "^android/build\\\\.gradle\\$"');
exec('npx patch-package png-metadata --exclude "^dummy\\$" --include "^lib/png-metadata\\\\.js\\$"');
