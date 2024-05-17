

# **** WORK IN PROGRESS ****



Do not use npm install in ppclient nor in emclient !!
use: yarn install

(This is because the resolutions directive in package.json is not supported in npm. We need that directive to fix the issue `cannot read property 'slice' of undefined` of react-native-quick-crypto. See https://github.com/margelo/react-native-quick-crypto/issues/242 for more info.)



use npm in ppimagemarker!

(otherwise there is an issue with the image picker - it never finished loading in the UI)



in sh,

. ./setenv.linux.sh

in other shells,

source ./setenv.linux.sh



npm install -g shelljs



