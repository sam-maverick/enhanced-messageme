const { createRunOncePlugin, withInfoPlist } = require('expo/config-plugins');

// https://forums.developer.apple.com/forums/thread/656616


const withInfoPlistDevelopmentTeam = (config, id) => {
  return withInfoPlist(config, async(config) => {

    const fs = require('fs');

    // Modifications to the Podfile

    let PodfileOriginalContents = fs.readFileSync('ios/Podfile', {encoding: 'utf8'});

    if ( ! PodfileOriginalContents.includes('config.build_settings["DEVELOPMENT_TEAM"] = ')) {
      let PodfileModifiedContents = PodfileOriginalContents.replace(
        '  post_install do |installer|', 
        '  post_install do |installer|\n\n\
    installer.generated_projects.each do |project|\n\
      project.targets.each do |target|\n\
        target.build_configurations.each do |config|\n\
          config.build_settings["DEVELOPMENT_TEAM"] = "L549K3FQ5X"\n\
        end\n\
      end\n\
    end\n'
      );
  
      fs.writeFileSync('ios/Podfile', PodfileModifiedContents, {encoding: 'utf8'});
  
      console.warn('PodfileModifiedContents:');
      console.warn(PodfileModifiedContents);
  
    }


    return config;
  });
};

module.exports = createRunOncePlugin(
  withInfoPlistDevelopmentTeam,
  'withInfoPlistDevelopmentTeam',
  '1.0.0'
);

// https://stackoverflow.com/questions/72171458/how-to-add-values-to-app-json-for-android-in-expo-managed-workflow
// https://stackoverflow.com/questions/75013370/create-a-expo-config-plugin-file-to-modify-android-manifest
