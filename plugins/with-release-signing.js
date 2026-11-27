// Signs release builds with the Daily Focus release key instead of the public debug key.
// The key and its passwords never live in this repo: they are read from Gradle properties,
// normally in %USERPROFILE%\.gradle\gradle.properties:
//
//   DAILY_FOCUS_STORE_FILE=E:/Development/keys/daily-focus-release.jks
//   DAILY_FOCUS_KEY_ALIAS=daily-focus
//   DAILY_FOCUS_STORE_PASSWORD=...
//   DAILY_FOCUS_KEY_PASSWORD=...
//
// Without them a release build stops with an error instead of quietly using the debug key.
// Kept as a config plugin so `expo prebuild` re-applies it.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// daily-focus-release-signing';

const RELEASE_SIGNING_CONFIG = `
        release { ${MARKER}
            def releaseStoreFile = findProperty('DAILY_FOCUS_STORE_FILE')
            if (releaseStoreFile) {
                storeFile file(releaseStoreFile)
                storePassword findProperty('DAILY_FOCUS_STORE_PASSWORD')
                keyAlias findProperty('DAILY_FOCUS_KEY_ALIAS')
                keyPassword findProperty('DAILY_FOCUS_KEY_PASSWORD')
            }
        }`;

const RELEASE_SIGNING_CHECK = `
// Release builds must use the Daily Focus release key. ${MARKER}
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.toLowerCase().contains('release') } && !findProperty('DAILY_FOCUS_STORE_FILE')) {
        throw new GradleException('Release signing is not set up: add DAILY_FOCUS_STORE_FILE, DAILY_FOCUS_KEY_ALIAS, DAILY_FOCUS_STORE_PASSWORD and DAILY_FOCUS_KEY_PASSWORD to %USERPROFILE%\\\\.gradle\\\\gradle.properties.')
    }
}
`;

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;

  // 1. Add a "release" entry inside signingConfigs { ... }, right after the debug one.
  const withConfig = gradle.replace(
    /(signingConfigs\s*\{\s*debug\s*\{[^}]*\})/,
    (match) => match + RELEASE_SIGNING_CONFIG
  );
  if (withConfig === gradle) {
    throw new Error('with-release-signing: could not find signingConfigs { debug { ... } } in app/build.gradle');
  }

  // 2. Make the release build type use it instead of signingConfigs.debug.
  const withBuildType = withConfig.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release'
  );
  if (withBuildType === withConfig) {
    throw new Error('with-release-signing: could not find the release build type signingConfig in app/build.gradle');
  }

  return withBuildType + RELEASE_SIGNING_CHECK;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
