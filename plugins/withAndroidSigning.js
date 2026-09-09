const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const marker = "// Gym Buddy local release signing";
    if (!config.modResults.contents.includes(marker)) {
      config.modResults.contents += `
${marker}
def gymSigningPath = System.getenv("GYM_ANDROID_SIGNING_FILE")
if (gymSigningPath) {
    def gymSigning = new Properties()
    new File(gymSigningPath).withInputStream { gymSigning.load(it) }
    android.signingConfigs.create("gymBuddy") {
        storeFile new File(gymSigning.getProperty("storeFile"))
        storePassword gymSigning.getProperty("storePassword")
        keyAlias gymSigning.getProperty("keyAlias")
        keyPassword gymSigning.getProperty("keyPassword")
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.gymBuddy
}
`;
    }
    return config;
  });
};
