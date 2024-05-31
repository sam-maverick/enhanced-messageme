
const crypto = require('crypto'); 
const fs = require("fs"); 
  
if (!fs.existsSync('./secrets/')){
    fs.mkdirSync('./secrets/');
}
if (!fs.existsSync('./secrets/wrapping/')){
    fs.mkdirSync('./secrets/wrapping/');
}
  
const keyPair = crypto.generateKeyPairSync(
    'rsa', {
        modulusLength: 3072,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8', 
            format: 'pem',
        }
    }
);

// Saving the keys
fs.writeFileSync('./secrets/wrapping/rsa-pubkey.pem', keyPair.publicKey); 
fs.writeFileSync('./secrets/wrapping/rsa-privkey.pem', keyPair.privateKey); 




/*
var cp = require('child_process');

cp.execSync(
    'openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out ./secrets/wrapping/rsa-keypair.pem',
    {stdio: 'inherit'}
);

cp.execSync(
    'openssl rsa -in ./secrets/rsa-keypair.pem -pubout -out ./secrets/wrapping/rsa-pubkey.crt',
    {stdio: 'inherit'}
);
*/


