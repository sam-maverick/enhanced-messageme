Welcome! This is **Enhanced Messageme**, a messaging platform for mobile devices with a middleware dubbed PP platform for secure image sharing. The middleware automatically encrypts and decrypts the pictures shared over the messaging app, and uses remote attestation APIs (Android's Play Integrity and iOS' App Attest) to certify that the recipient does not break the security of ephemeral messaging features.

This project is based on a fork of [Messageme](https://github.com/sam-maverick/messageme/) (CC BY 4.0, Joel Samper and Bernardo Ferreira), which is a no-frills playground messaging app that we take as our base. Both projects are for testing and academic purposes.

You can deploy the Enhanced Messageme project on a single computer. It is composed of:

- emclient: This is a messaging app that features the ability to exchange text and pictures over private chats among users.  For the client, you can use either emulators or physical devices. NOTE: If you want to run phone emulators, it is highly recommended to deploy this project on a bare metal machine, not a virtual machine.
- emserver: The server of the messaging platform
- ppclient: A middleware that handles private pictures exchanged through the messaging app, and that uses remote attestation API to verify software integrity and to enforce privacy policies.
- ppserver: The server of the PP platform

The client apps have been developed with [Expo Go](https://expo.dev/go) and [React Native](https://reactnative.dev/), so that you can run them on Android and iOS devices. The servers have been developed with [NestJS](https://nestjs.com/) and use a [MongoDB](https://www.mongodb.com) self-hosted database in the backend.

We have tested most things on a fresh install of Kali Linux, but you should be able to deploy it on any platform if you follow the provided reference links. For the app binaries, we provide a build.js script for convenience. The steps we suggest are meant for an isolated lab environment, meaning that it's on your responsibility to check their impact on your particular computing and networking environment.

# 1. Preparing the network environment

If you do not intend to use physical devices, then skip to next section.

You first set up your computer to act as a WiFi Access Point for the phones to connect to. In our lab, the computer is connected to the Internet via an Ethernet cable (interface eth0). We used [create_ap](https://github.com/oblique/create_ap/) in NAT mode, so that the phones can reach both the computer and the Internet without configuring any routing on the computer. Note that create_ap is not maintained any more but the other tools we tried did not work in our system. Below is our template for `/etc/create_ap.conf`, which creates a hidden WiFi.

```
CHANNEL=default

WPA_VERSION=2

ETC_HOSTS=0
NO_DNS=1
NO_DNSMASQ=1

HIDDEN=1
MAC_FILTER=0

ISOLATE_CLIENTS=1
SHARE_METHOD=nat

DRIVER=nl80211

COUNTRY=PT
FREQ_BAND=2.4

WIFI_IFACE=wlan0
INTERNET_IFACE=eth0
SSID=LabWifi
PASSPHRASE=changeme
```

*NOTE: From our experience, by looking at the [Wireshark](https://www.wireshark.org/) traces, create_ap intercepts DNS requests and uses /etc/resolv.conf to forward those requests to external DNS servers. This is not shown in netstat; we suppose that create_ap intercepts the traffic to the virtual interface at the low level. This is also undocumented. To avoid this behavior, use the suggested ETC_HOSTS, NO_DNS and NO_DNSMASQ parameters. With those parameters configured as we suggest, DNS requests are captured by the dnsmasq service.* 

Note that the virtual interface ap0 is created, which links to the wlan0 physical interface. Assign an IP address to ap0, within a new subnet (we used 192.168.12.1/24 in our environment).

To start the Access Point, run:

```
systemctl start create_ap
```

To make the service start automatically when you boot up your computer, run:

```
systemctl enable create_ap
```

Next, configure your computer to act as a DHCP and DNS server, for it to serve addresses within ap0's subnet. We used [dnsmasq](https://wiki.archlinux.org/title/dnsmasq). These are the main configuration options of our `/etc/dnsmasq.conf`:

```
dhcp-range=192.168.12.100,192.168.12.199,255.255.255.0,12h
bind-interfaces
interface=ap0
```

Add these entry to your `/etc/hosts`:

```
# Use 192.168.12.1 when running on network; 10.0.2.2 when running on emulator
# Run `systemctl dnsmasq restart` to apply changes
192.168.12.1    ppserver-gen.localnet
```

Note that "gen" must correspond to the `PP_PLATFORM_NICKNAME` parameter in `ppclient/src/parameters.js`

To start the DHCP server, run:

```
systemctl start dnsmasq
```

To make the service start automatically when you boot up your computer, run:

```
systemctl enable dnsmasq
```

*NOTE: From our experience, by looking at the [Wireshark](https://www.wireshark.org/) traces, create_ap bridges the DHCP Discover request frames received from ap0 to our eth0. If you have a DHCP server in your Ethernet network, it will offer IP addresses to the phones within the subnet range of your Ethernet. In other words, your phone will receive two DHCP Offer messages: One from the DHCP server of your computer, and one from the DHCP of your Ethernet network. Because your computer will probably reply faster, this issue will likely come unnoticed. If you run into network issues, you may want to use static IP addresses instead, or to otherwise filter the DHCP frames.*

You should now be able to connect via WiFi from your phone. Once connected, check that you have Internet access and that you can ping the computer (there are many free apps to do so).

Also, throughout this guide, remember to open any necessary ports of the firewall of your computer's OS, if applicable.

# 2. Installing the development environment

Follow the steps to [install Expo](https://docs.expo.dev/get-started/installation/). See the notes below if you need more help.

For the **Node.js** installation, we used the [installation script](https://github.com/nodesource/distributions#ubuntu-versions):

```
curl -fsSL https://deb.nodesource.com/setup_21.x | sudo -E bash - &&\
sudo apt-get install -y nodejs
```

Check:

```
node -v
```

In our environment, we have `v21.6.0`

To install **git**, do

```
sudo apt-get install git
```

Check:

```
git --version
```

In our environment, we have `git version 2.34.1`

We can then clone this repo:

```
git clone https://github.com/sam-maverick/enhanced-messageme
```

For **watchman**, install curl with

```
sudo apt-get install curl 
```

Then install [brew](https://brew.sh/) with

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

<u>REMINDER</u>: Don't forget to follow the Next Steps that are indicated at the end of the output of the brew installation.

Check:

```
brew -v
```

In our environment, we have `Homebrew 4.2.4`

Install watchman with

```
brew install watchman
```

Check:

```
watchman version
```

In our environment, we have `version: 2023.12.04.00`

Install yarn with

```
npm install --global yarn
```

Check:

```
yarn --version
```

In our environment, we have version `1.22.21`

You should now be ready to use Expo.

# 3. Installing Node.js modules

*NOTE: Do not use npm in ppclient nor in emclient !! Use yarn only!! This is because the 'resolutions' directive in package.json is not supported in npm. We need that directive to fix the issue `cannot read property 'slice' of undefined` of react-native-quick-crypto. See https://github.com/margelo/react-native-quick-crypto/issues/242 for more info.*

First of all, from any folder,

```
npm install -g shelljs
npm install -g react-native-asset
```

Then, you will have to run the command below every time you open a new console. This is to configure some required environment variables that cannot be set from within a Node script file. Sorry! The example below works for Linux and Mac systems. I provide a `setenv.windows.cmd` equivalent although I have not tested it.

```
. ./setenv.linux.sh
```



Now we can install the required modules. Notice that some are `yarn` while others are `npm`.

From the `emclient/` folder,

```
yarn install
```

From the `ppclient/` folder,

```
yarn install
```

From the `ppimagemarker/` folder,

```
yarn install
```

From the `emserver/` folder,

```
npm install
```

From the `ppserver/` folder,

```
npm install
```

# 4. Deploying the digital certificates

**Create directory structure**

```
mkdir secrets 2> /dev/null
mkdir secrets/https 2> /dev/null
mkdir secrets/https/ca 2> /dev/null
mkdir secrets/https/srv 2> /dev/null
```

**CA deployment for TLS**

If you ever generate a new key but reuse an ancient CN for the CA, then do not create a new serial. You must reuse the old serial because otherwise Firefox complains about reusing serial numbers (it considers two CA's with the same CN to be the same CA). From the ppserver directory,

```
echo "01" > ./secrets/https/ca/crlnumber
echo "01" > ./secrets/https/ca/serial
touch ./secrets/https/ca/index.txt
```

This is to list available ECC algorithms:

```
openssl ecparam -list_curves
```

Generate private key using ECC

```
openssl ecparam -genkey -name prime256v1 -out ./secrets/https/ca/ca_priv.key
```

Generate CA certificate

```
openssl req -config ./openssl-ca.cnf -new -nodes -days 3650 -x509 -extensions v3_ca -key ./secrets/https/ca/ca_priv.key -out ./secrets/https/ca/ca_cert.cer
```

Generate first CRL for the CA

```
openssl ca -gencrl -crldays 5840 -config ./openssl-ca.cnf -keyfile ./secrets/https/ca/ca_priv.key -cert ./secrets/https/ca/ca_cert.cer -out ./secrets/https/ca/ca_crl_B64.crl
```

**Server certificate deployment for TLS**

Generate private key using ECC

```
mkdir secrets/https/srv
openssl ecparam -genkey -name prime256v1 -out ./secrets/https/srv/srv_priv.key
```

Generate new certificate and CSR for the server

```
openssl req -config ./openssl-srv.cnf -new -nodes -days 1460 -key ./secrets/https/srv/srv_priv.key -out ./secrets/https/srv/srv_csr.csr
```

We sign the CSR with our CA

```
openssl ca -config ./openssl-ca.cnf -days 1460 -out ./secrets/https/srv/srv_cert.cer -infiles ./secrets/https/srv/srv_csr.csr
```

We attach the CA certificate to the certificate chain of the server certificate

```
echo "" >> ./secrets/https/srv/srv_cert.cer
cat ./secrets/https/ca/ca_cert.cer >> ./secrets/https/srv/srv_cert.cer
```

This is it for the server. If you observer src/main.ts you will see that our NestJS server will read the certificate files we just generated.

**Android certificate pinning for TLS**

```
cp ./secrets/https/ca/ca_cert.cer ../ppclient/assets/custom/ca_cert.cer
```

Because the CA certificate is embedded within the app assets, there is no need to install the CA in the Android system as a trusted user certificate. That would only be necessary if we were to use a browser to connect to https://ppserver-gen.localnet..., which is not the case. once you build the ppclient app, it will configure the certificate pinning via the android-manifest-https-traffic.js plugin.

**Configuring the digital certificate for wrapping and unwrapping of the private pictures**

This is as simple as

```
node ./genkeys-wrapping.js
```

# 5. Editing configuration files

Edit the configuration files according to your needs and your environment:

`emclient/src/parameters.js` 

`emserver/src/parameters.ts`

`ppclient/src/parameters.js`

`ppserver/src/parameters.ts`

`ppserver/.env`

`ppimagemarker/src/parameters.js`

You must also change the name, slug, package and bundleIdentifier of `ppclient/app.json`, and the PARAM_PP\__SERVICE_PLAYSTOREID and  PARAM_PP__SERVICE_IOSAPPID parameters in `emclient/os_update/update-parameters.js` if you want to upload the app in the Android or Apple app repositories.

# 6. Installing MongoDB

Download the [Community Server](https://www.mongodb.com/try/download/community) and install it:

```
sudo dpkg -i mongodb-org-server_7.0.5_amd64.deb
```

Check:

```
mongod --version
```

Enable the service (so that it starts when your computer boots up):

```
sudo systemctl enable mongod
```

Start the service:

```
sudo systemctl start mongod
```

Check the service:

```
sudo systemctl status mongod
```

Optionally, install the [MongoDB Compass](https://www.mongodb.com/products/tools/compass). It is a GUI for this database.

# 7. Starting the servers

Install NestJS CLI tools, as explained in the [docs](https://docs.nestjs.com/):

```
npm i -g @nestjs/cli
```

From the **`ppserver/`** folder, start the server:

```
npm start --reset-cache
```

You should get a `Nest application successfully started`. 

You can load this URL from a local browser on the server, to check that it works:

http://ppserver-gen-phy.localnet:3020/test/doNothing

From the **`emserver/`** folder, start the server:

```
npm start --reset-cache
```

You should get a `Nest application successfully started`.

# 8. Preparing the tools for the EAS build for Android APK/AAB

Building the APK/AAB is known as a 'production build'. Here we will deploy the app as a bare React Native app. You will need to compile your project to generate the APK file. The [Expo Go 'Create your first build' guide](https://docs.expo.dev/build/setup/) provides the steps to use the EAS cloud service for the compilation. However, we prefer to compile locally, using the [Expo Go 'Local app development' guide](https://docs.expo.dev/guides/local-app-development/). Below is a summary of the steps you need to perform.

We already have the Node.js, watchman, and Android Studio set up in previous steps. So now we have to install the JDK that we have downloaded from [here](https://wiki.openjdk.org/display/JDKUpdates/JDK+17u). NOTE: It does not work with Java 21.

To install the JDK, just unpack it somewhere in your computer and add the path to the bin folder to the PATH environment variable, as we did in previous steps. In our case, the path is `/home/devuser/software/OpenJDK17/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7/jdk-17.0.10+7/bin`

After having restarted your computer, check:

```
java --version
```

In our environment, we have `openjdk 17.0.10 2024-01-16`

Now, we have to follow steps 1 & 2 from the Expo Go 'Create your first build' guide, so:

Install EAS. Despite not being stated in the official guide, we needed a sudo:

```
sudo npm install -g eas-cli
```

Then log in to your EAS account. If you do not have any, just create one at https://expo.dev. Please note that this is the EAS account; not your Android Developer account.

```
eas login
```

To prepare your environment for development builds, follow the steps explained in the '<u>Install with adb</u>' section of the [Expo Go 'Build APKs for Android Emulators and devices' guide](https://docs.expo.dev/build-reference/apk/#install-with-adb).

# 9. Preparing the tools for the EAS build for iOS

**NOTE: You will need a MacOS computer to compile the app for iOS.**

According to this [guide](https://docs.expo.dev/build-reference/local-builds/), you first need to install fastlane:

```
brew install fastlane
```

According to [this guide](https://docs.expo.dev/build/setup/), "*If you have not generated a provisioning profile and/or distribution certificate yet, you can let EAS CLI take care of that for you by signing into your Apple Developer Program account and following the prompts.*"

Install EAS:

```
npm install -g eas-cli
```

Then log in to your EAS account. If you do not have any, just create one at https://expo.dev. Please note that this is the EAS account; not your Apple Developer account. You will be asked about your Apple Developer account credentials later.

```
eas login
```


You then need to follow the instructions [here](https://developer.apple.com/support/expiration/) to install the new Apple Worldwide Developer Relations Intermediate Certificate. Otherwise, you will get the following error when deploying the app: `Distribution certificate with fingerprint <...> hasn't been imported successfully`. Once you import the certificate, double-click on it from Keychain Access, expand Trust, and select "Use System Defaults" for "When using this certificate". If you select "Always trust" you may run into issues, as explained [here](https://forums.developer.apple.com/forums/thread/712043).

# 10. Deploying the apps

For deploying the apps, we provide a `build.js` script that performs all the necessary steps to perform a clean build of the app bundle. We use the **local build** of EAS rather than the server build. You do not need to (nor should) modify the `android` and `ios` folders under the ppimagemarker, emclient, and ppclient folders. Once the build is complete, it will automatically install it on the phone that is connected to your computer, if applicable. You can install ppimagemarker and emclient locally, but you will need to install the ppclient from the Apple/Android official stores by using the Android AAB production build or the iOS build; otherwise the app integrity API will fail. [This Expo guide](https://docs.expo.dev/submit/) explains how to publish in Apple's and Google's app software repositories. This [Apple guide](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases) explains how to use TestFlight for beta builds.

**Repeat all the steps below from the ppimagemarker, emclient, and ppclient folders, separately:**

| Android                                                      |
| ------------------------------------------------------------ |
| **IMPORTANT: On Android, always install emclient before ppclient, otherwise you will run into [this issue](https://stackoverflow.com/questions/11730085/android-custom-permission-fails-based-on-app-install-order)**. Once both are installed, you can update/redeploy them in any order as long as you do not uninstall them.<br /><br />For the development build for Android (can be used with a physical device), connect the phone to the computer and run:<br />`node ./build.js bare patch nosavepatches`<br /><br />To generate the Android APK or AAB files for the production builds, run either:<br />`node ./build.js apk patch nosavepatches`<br />`node ./build.js aab patch nosavepatches` |

| iOS                                                          |
| ------------------------------------------------------------ |
| **IMPORTANT: The commands below make the Apple developer account credentials available to the EAS utility, which is a third party software. Although Apple accounts may be protected with a security layer of two-factor authentication, this still poses security risks. Please consult with a security expert before proceeding if you are unsure about the implications of this step.**<br /><br />Answer Y when asked "Do you want to log in to your Apple account" in the commands below. You will then have to enter your Apple Developer account credentials<br /><br />For the development build (can be used with iOS simulator), the command is:<br />`node ./build.js barei patch nosavepatches`<br /><br />To compile for iOS for a production build, run the command below.<br />`node ./build.js ios patch nosavepatches`<br /><br />When you try to build for iOS for the first time, you are asked about the Apple developer credentials you want to use. If you need to change the credentials after they have been cached by EAS, I recommend you check [this reference](https://stackoverflow.com/questions/72883150/how-to-logout-from-appleid-on-expo-build). |

# 11. Acknowledgements

The project that gave rise to these results received the support of a fellowship from ”la Caixa” Foundation (ID 100010434). The fellowship code is LCF/BQ/DI22/11940036. This work was also supported by FCT through the LASIGE Research Unit (UIDB/00408/2020 and UIDP/00408/2020).

# 12. License

This work is licensed under CC BY 4.0. See [LICENSE](LICENSE) for more details.
