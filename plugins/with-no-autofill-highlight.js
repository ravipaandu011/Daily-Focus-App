// Removes Android's yellow autofill highlight on text fields (shown after picking a saved password).
// Autofill itself keeps working. Kept as a config plugin so `expo prebuild` re-applies it.
const { AndroidConfig, withAndroidStyles } = require('expo/config-plugins');

module.exports = function withNoAutofillHighlight(config) {
  return withAndroidStyles(config, (cfg) => {
    cfg.modResults = AndroidConfig.Styles.assignStylesValue(cfg.modResults, {
      add: true,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      name: 'android:autofilledHighlight',
      value: '@android:color/transparent',
      targetApi: '26',
    });
    return cfg;
  });
};
