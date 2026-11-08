const { test } = require("node:test");
const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const mobileRequire = createRequire(path.resolve(__dirname, "../package.json"));
test("Expo UI color rendering has its required native ColorCompat class", () => {
  const core = path.dirname(mobileRequire.resolve("expo-modules-core/package.json"));
  assert.ok(existsSync(path.join(core, "android/src/main/java/expo/modules/kotlin/types/ColorCompat.kt")), "Expo UI requires a newer expo-modules-core: ColorCompat is missing and causes a startup crash");
});
