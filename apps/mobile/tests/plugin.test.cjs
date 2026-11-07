const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");

test("iOS prebuild creates one credential extension with shared Keychain settings", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vaultix-plugin-"));
  try {
    const source = path.resolve(__dirname, "../plugins/withVaultixAutofill.js");
    let xcodeMod;
    const passthrough = (c) => c;
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(source, "utf8"), {
      module, require: (name) => name === "@expo/config-plugins" ? {
        withXcodeProject: (c, mod) => { xcodeMod = mod; return c; },
        withEntitlementsPlist: passthrough, withInfoPlist: passthrough,
        withAndroidManifest: passthrough, withDangerousMod: passthrough,
        withAppBuildGradle: passthrough, withGradleProperties: passthrough,
      } : require(name),
    });
    module.exports({});
    const settings = {};
    let added = 0;
    const phases = [];
    const project = {
      hash: { project: { objects: { XCConfigurationList: { list: { buildConfigurations: [{ value: "debug" }] } } } } },
      pbxTargetByName: () => added > 0,
      addTarget: (name, type, folder, bundle) => {
        added++;
        assert.equal(type, "app_extension");
        assert.equal(bundle, "ts.mila.vaultix.autofill");
        return { uuid: "extension", pbxNativeTarget: { buildConfigurationList: "list" } };
      },
      addBuildPhase: (...args) => phases.push(args),
      pbxXCBuildConfigurationSection: () => ({ debug: { buildSettings: settings } }),
    };
    const config = {
      ios: { bundleIdentifier: "ts.mila.vaultix", appleTeamId: "TEAM" },
      modResults: project,
      modRequest: { platformProjectRoot: root, projectRoot: path.resolve(__dirname, "..") },
    };
    xcodeMod(config);
    xcodeMod(config);
    assert.equal(added, 1);
    assert.equal(settings.CODE_SIGN_ENTITLEMENTS, "VaultixAutofill/VaultixAutofill.entitlements");
    assert.equal(settings.DEVELOPMENT_TEAM, "TEAM");
    assert.equal(phases[0][0][0], "VaultixAutofill/CredentialProviderViewController.swift");
    assert.ok(fs.existsSync(path.join(root, "VaultixAutofill/Info.plist")));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("native application and autofill module use the ts.mila.vaultix package", () => {
  const root = path.resolve(__dirname, "..");
  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  assert.equal(app.expo.android.package, "ts.mila.vaultix");
  assert.equal(app.expo.ios.bundleIdentifier, "ts.mila.vaultix");
  const moduleRoot = path.join(root, "modules/vaultix-autofill");
  const module = JSON.parse(fs.readFileSync(path.join(moduleRoot, "expo-module.config.json"), "utf8"));
  const className = "ts.mila.vaultix.autofill.VaultixAutofillModule";
  assert.deepEqual(module.android.modules, [className]);
  const source = fs.readFileSync(path.join(moduleRoot, "android/src/main/java", className.replaceAll(".", "/") + ".kt"), "utf8");
  assert.match(source, /^package ts\.mila\.vaultix\.autofill/m);
  const gradle = fs.readFileSync(path.join(moduleRoot, "android/build.gradle"), "utf8");
  assert.match(gradle, /namespace 'ts\.mila\.vaultix\.autofill'/);
});
