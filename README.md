Welcome! This is **Enhanced Messageme**, a messaging platform for mobile devices with a middleware dubbed **PP platform**. We developed it for testing and academic purposes. You can deploy this project on a single computer. It is composed of:

- emclient: This is a messaging app that features the ability to exchange text and pictures over private chats among users.  For the client, you can use either emulators or physical devices. NOTE: If you want to run phone emulators, it is highly recommended to deploy this project on a bare metal machine, not a virtual machine.
- emserver: The server of the messaging platform
- ppclient: A middleware that handles private pictures exchanged through the messaging app, and that uses remote attestation API to verify software integrity and to enforce privacy policies.
- ppserver: The server of the PP platform

The client apps have been developed with [Expo Go](https://expo.dev/go) and [React Native](https://reactnative.dev/), so that you can run it on Android and iOS devices. The servers have been developed with [NestJS](https://nestjs.com/) and use a [MongoDB](https://www.mongodb.com) self-hosted database in the backend.

We have tested most things on a fresh install of Ubuntu Desktop 22.04.3, but you should be able to deploy it on any platform if you follow the provided reference links and adapt som shell scripts. For the clients, we provide a build.js script for convenience. The steps we suggest are meant for an isolated lab environment, meaning that it's on your responsibility to check their impact on your particular computing and networking environment.

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

# 2. Installing the Expo Go development environment

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

Finally, install watchman with

```
brew install watchman
```

Check:

```
watchman version
```

In our environment, we have `version: 2023.12.04.00`

You should now be fine to use Expo.

# 3. Installing Node.js modules

*NOTE: Do not use npm in ppclient nor in emclient !! Use yarn only!! This is because the 'resolutions' directive in package.json is not supported in npm. We need that directive to fix the issue `cannot read property 'slice' of undefined` of react-native-quick-crypto. See https://github.com/margelo/react-native-quick-crypto/issues/242 for more info.*

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

You can ignore any warnings and notices for now.

From any folder,

```
npm install -g shelljs
```

# 4. Editing configuration files

Edit the configuration files according to your needs and your environment:

`emclient/src/parameters.js` 

`emserver/src/parameters.ts`

`ppclient/src/parameters.js`

`ppserver/src/parameters.ts`

`ppserver/.env`

`ppimagemarker/src/parameters.js`

You must also change the name, slug, package and bundleIdentifier of `ppclient/app.json`, and the PARAM_PP\__SERVICE_PLAYSTOREID and  PARAM_PP__SERVICE_IOSAPPID parameters in `emclient/os_update/update-parameters.js` if you want to upload the app in the Android or Apple app repositories.

# 5. Installing MongoDB

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

# 6. Starting the servers

Install NestJS CLI tools, as explained in the [docs](https://docs.nestjs.com/):

```
npm i -g @nestjs/cli
```

From the `ppserver/` folder, start the server:

```
npm start --reset-cache
```

You should get a `Nest application successfully started`. 

You can load this URL from a local browser on the server, to check that it works:

http://ppserver-gen-phy.localnet:3020/test/doNothing



From the `emserver/` folder, start the server:

```
npm start --reset-cache
```

You should get a `Nest application successfully started`.

# 7. Preparing the tools for the EAS build for Android APK/AAB

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

Then log in to your EAS account. If you do not have any, just create one.

```
eas login
```

To prepare your environment for development builds, follow the steps explained in the '<u>Install with adb</u>' section of the [Expo Go 'Build APKs for Android Emulators and devices' guide](https://docs.expo.dev/build-reference/apk/#install-with-adb).

# 8. Deploying the apps

##### You will need to perform the steps below from the ppclient, ppimagemarker and emclient folders, separately:

Run this to set some environment variables:

```
. ./setenv.linux.sh
```

For the development build, connect the phone to the computer and run:

```
node ./build.js bare patch nosavepatches
```

To generate the APK or AAB files for the production builds, run either:

```
node ./build.js apk patch nosavepatches
node ./build.js aab patch nosavepatches
```

# 9. Acknowledgements

The project that gave rise to these results received the support of a fellowship from ”la Caixa” Foundation (ID 100010434). The fellowship code is LCF/BQ/DI22/11940036. This work was also supported by FCT through the LASIGE Research Unit (UIDB/00408/2020 and UIDP/00408/2020).

# 10. License

This work is licensed under CC BY 4.0. See [LICENSE](LICENSE) for more details.
