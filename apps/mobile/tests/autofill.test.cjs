const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const vm = require("node:vm");
const path = require("node:path");

function setup(unseal = async () => "key") {
  const saved = [];
  let cleared = 0;
  const source = readFileSync(path.join(__dirname, "../lib/autofill.ts"), "utf8")
    .replace(/^import .*;\n/gm, "").replace(/export /g, "");
  const context = vm.createContext({
    URL, saveCredentials: (value) => saved.push(JSON.parse(JSON.stringify(value))),
    clearCredentials: () => cleared++, unsealKey: unseal,
    decryptSecret: async () => "secret",
  });
  vm.runInContext(stripTypeScriptTypes(source) + "\nglobalThis.api = { syncAutofill, clearAutofill, cancelAutofillSync };", context);
  return { ...context.api, saved, cleared: () => cleared };
}
const entry = (website_url) => ({ id: "1", website_url, username: "alice", sealed_key: "key", encrypted_password: "cipher", password_nonce: "nonce" });

test("normalizes websites and preserves explicit Android package associations", async () => {
  const api = setup();
  for (const [url, expected] of [["https://EXAMPLE.com./login", "example.com"], ["example.com", "example.com"], ["androidapp://com.example.app", "androidapp://com.example.app"], ["javascript:alert(1)", ""], [null, ""]]) {
    await api.syncAutofill([entry(url)], "public", "private");
    assert.equal(api.saved.at(-1)[0].domain, expected);
  }
});
test("empty vault replaces old credentials and decryption failures are excluded", async () => {
  const api = setup(async () => { throw Error("revoked"); });
  await api.syncAutofill([entry("example.com")], "public", "private");
  await api.syncAutofill([], "public", "private");
  assert.deepEqual(api.saved, [[], []]);
});
test("logout prevents a pending decrypt from republishing credentials", async () => {
  let release;
  const api = setup(() => new Promise((resolve) => { release = resolve; }));
  const pending = api.syncAutofill([entry("example.com")], "public", "private");
  api.clearAutofill();
  release("key");
  await pending;
  assert.equal(api.cleared(), 1);
  assert.deepEqual(api.saved, []);
});
test("a newer sync supersedes an older pending sync", async () => {
  let release;
  const api = setup(() => new Promise((resolve) => { release = resolve; }));
  const pending = api.syncAutofill([entry("example.com")], "public", "private");
  await api.syncAutofill([], "public", "private");
  release("key");
  await pending;
  assert.deepEqual(api.saved, [[]]);
});
test("unmount cancels a pending sync", async () => {
  let release;
  const api = setup(() => new Promise((resolve) => { release = resolve; }));
  const pending = api.syncAutofill([entry("example.com")], "public", "private");
  api.cancelAutofillSync();
  release("key");
  await pending;
  assert.deepEqual(api.saved, []);
});
