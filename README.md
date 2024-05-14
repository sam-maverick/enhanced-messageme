

# **** WORK IN PROGRESS ****



use:

yarn install



Do not use npm install!

(This is because the resolutions directive in package.json is not supported in npm. We need that directive to fix the issue `cannot read property 'slice' of undefined` of react-native-quick-crypto. See https://github.com/margelo/react-native-quick-crypto/issues/242 for more info.)





in sh,

. ./setenv.linux.sh

in other shells,

source ./setenv.linux.sh



npm install -g shelljs



