const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
test("mobile interface has no Expo UI imports", () => {
 const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []);
 for (const file of [...files(path.join(root, "app")), ...files(path.join(root, "components"))]) assert.doesNotMatch(readFileSync(file, "utf8"), /@expo\/ui/);
});
