const { test } = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const mobileRequire = createRequire(path.resolve(__dirname, "../package.json"));
test("Expo UI color rendering has its required native ColorCompat class", () => {
  const core = path.dirname(mobileRequire.resolve("expo-modules-core/package.json"));
  assert.ok(existsSync(path.join(core, "android/src/main/java/expo/modules/kotlin/types/ColorCompat.kt")), "Expo UI requires a newer expo-modules-core: ColorCompat is missing and causes a startup crash");
});

test("Expo UI text fields have the core shared-object lifecycle hook", () => {
  const core = path.dirname(mobileRequire.resolve("expo-modules-core/package.json"));
  const index = readFileSync(path.join(core, "src/index.ts"), "utf8");
  assert.match(index, /export \* from ['"]\.\/hooks\/useReleasingSharedObjectWithLifecycle['"]/);
  const hook = readFileSync(path.join(core, "src/hooks/useReleasingSharedObjectWithLifecycle.ts"), "utf8");
  assert.match(hook, /export function useReleasingSharedObjectWithLifecycle/);
});
