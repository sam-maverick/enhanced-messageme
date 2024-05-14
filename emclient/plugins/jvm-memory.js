const { createRunOncePlugin, withNothing } = require('@expo/config-plugins');

 
const withJvmMemory = config => {
  // Do not use console.log, as gradle takes it as the return config value
  console.error('calling withJvmMemory');
 
  try {
    var fs = require('fs');
    var path = require('path');

    var myfilepath = path.parse(__dirname).dir+'/android/gradle.properties';
    
    console.error('path is: ' + myfilepath);
  
    var text = fs.readFileSync(myfilepath, {encoding: 'utf8', flag: 'r'});
   
    text = text.toString().replace(/org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m/, 'org.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=3072m');

    fs.writeFileSync(myfilepath, text, {encoding: 'utf8', flag: 'w+'});

    console.error('withJvmMemory success');    

  } catch (err) {
    console.error('Error: '+err.message);
  }

  return config;
  
};

module.exports = createRunOncePlugin(
  withJvmMemory,
  'withJvmMemory',
  '1.0.0'
);

