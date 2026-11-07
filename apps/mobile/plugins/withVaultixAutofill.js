const {
  withEntitlementsPlist,
  withXcodeProject,
  withInfoPlist,
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

// iOS app and credential-provider extension share the same App Group.
function withIosAppGroup(config) {
  return withEntitlementsPlist(config, (c) => {
    const key = "com.apple.security.application-groups";
    const groups = new Set(c.modResults[key] || []);
    groups.add(APP_GROUP);
    c.modResults[key] = Array.from(groups);
    c.modResults["keychain-access-groups"] = Array.from(new Set([
      ...(c.modResults["keychain-access-groups"] || []), "$(AppIdentifierPrefix)ts.mila.vaultix",
    ]));
    return c;
  });
}

function withIosExtension(config) {
  return withXcodeProject(config, (c) => {
    const project = c.modResults;
    const name = "VaultixAutofill";
    const destination = path.join(c.modRequest.platformProjectRoot, name);
    fs.mkdirSync(destination, { recursive: true });
    for (const file of fs.readdirSync(path.join(c.modRequest.projectRoot, "autofill/ios"))) {
      fs.copyFileSync(path.join(c.modRequest.projectRoot, "autofill/ios", file), path.join(destination, file));
    }
    if (project.pbxTargetByName(name)) return c;
    const target = project.addTarget(name, "app_extension", name, `${c.ios.bundleIdentifier}.autofill`);
    project.addBuildPhase([`${name}/CredentialProviderViewController.swift`], "PBXSourcesBuildPhase", "Sources", target.uuid);
    project.addBuildPhase([], "PBXResourcesBuildPhase", "Resources", target.uuid);
    project.addBuildPhase([], "PBXFrameworksBuildPhase", "Frameworks", target.uuid);
    const configurations = project.pbxXCBuildConfigurationSection();
    const list = project.hash.project.objects.XCConfigurationList[target.pbxNativeTarget.buildConfigurationList];
    for (const ref of list.buildConfigurations) {
      const settings = configurations[ref.value].buildSettings;
      Object.assign(settings, {
        INFOPLIST_FILE: `${name}/Info.plist`,
        CODE_SIGN_ENTITLEMENTS: `${name}/VaultixAutofill.entitlements`,
        SWIFT_VERSION: "5.0",
        IPHONEOS_DEPLOYMENT_TARGET: "15.1",
        APPLICATION_EXTENSION_API_ONLY: "YES",
        SKIP_INSTALL: "YES",
        TARGETED_DEVICE_FAMILY: '"1,2"',
      });
      if (c.ios.appleTeamId) settings.DEVELOPMENT_TEAM = c.ios.appleTeamId;
    }
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
  config = withInfoPlist(config, (c) => {
    c.modResults.VaultixKeychainAccessGroup = "$(AppIdentifierPrefix)ts.mila.vaultix";
    return c;
  });
  config = withIosAppGroup(config);
  config = withIosExtension(config);
  config = withAndroidService(config);
  return config;
};
