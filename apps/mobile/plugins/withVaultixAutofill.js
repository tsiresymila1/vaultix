const {
  withEntitlementsPlist,
  withAndroidManifest,
  withDangerousMod,
  withAppBuildGradle,
  withGradleProperties,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const APP_GROUP = "group.ts.mila.vaultix";
const SECURITY_DEP = "androidx.security:security-crypto:1.1.0-alpha06";
const ANDROID_MIN_SDK = 26;

// --- iOS: App Group on the main app (so it can write the shared credential store).
// The AutoFill Credential Provider *extension target* itself must be added in
// Xcode after `expo prebuild` (target creation via pbxproj is not done here) —
// its sources live in autofill/ios/. See README.
function withIosAppGroup(config) {
  return withEntitlementsPlist(config, (c) => {
    const key = "com.apple.security.application-groups";
    const groups = new Set(c.modResults[key] || []);
    groups.add(APP_GROUP);
    c.modResults[key] = Array.from(groups);
    return c;
  });
}

// --- Android: register the AutofillService, ship its sources, add the crypto dep.
function withAndroidService(config) {
  config = withGradleProperties(config, (c) => {
    const minSdk = c.modResults.find(
      (item) => item.type === "property" && item.key === "android.minSdkVersion",
    );
    const value = String(ANDROID_MIN_SDK);

    if (minSdk) {
      minSdk.value = value;
    } else {
      c.modResults.push({ type: "property", key: "android.minSdkVersion", value });
    }

    return c;
  });

  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application[0];
    app.service = app.service || [];
    const name = "ts.mila.vaultix.autofill.VaultixAutofillService";
    if (!app.service.some((s) => s.$["android:name"] === name)) {
      app.service.push({
        $: {
          "android:name": name,
          "android:label": "Vaultix",
          "android:permission": "android.permission.BIND_AUTOFILL_SERVICE",
          "android:exported": "true",
        },
        "meta-data": [
          { $: { "android:name": "android.autofill", "android:resource": "@xml/autofill_service" } },
        ],
        "intent-filter": [
          { action: [{ $: { "android:name": "android.service.autofill.AutofillService" } }] },
        ],
      });
    }
    return c;
  });

  config = withDangerousMod(config, [
    "android",
    (c) => {
      const androidRoot = c.modRequest.platformProjectRoot;
      const src = path.join(c.modRequest.projectRoot, "autofill/android");
      const javaDir = path.join(androidRoot, "app/src/main/java/ts/mila/vaultix/autofill");
      fs.mkdirSync(javaDir, { recursive: true });
      fs.copyFileSync(
        path.join(src, "VaultixAutofillService.kt"),
        path.join(javaDir, "VaultixAutofillService.kt"),
      );
      const xmlDir = path.join(androidRoot, "app/src/main/res/xml");
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.copyFileSync(
        path.join(src, "autofill_service.xml"),
        path.join(xmlDir, "autofill_service.xml"),
      );
      return c;
    },
  ]);

  config = withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes("androidx.security:security-crypto")) {
      c.modResults.contents = c.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation '${SECURITY_DEP}'`,
      );
    }
    return c;
  });

  return config;
}

module.exports = function withVaultixAutofill(config) {
  config = withIosAppGroup(config);
  config = withAndroidService(config);
  return config;
};
