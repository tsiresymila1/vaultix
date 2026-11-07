const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const vm = require("node:vm");
const path = require("node:path");
test("only authenticated encrypted material is persisted; private keys stay in memory", async () => {
  const data = new Map([["vx_pw_pk", "legacy-private"]]);
  const context = vm.createContext({ SecureStore: {
    setItemAsync: async (k, v) => data.set(k, v), getItemAsync: async k => data.get(k) ?? null,
    deleteItemAsync: async k => data.delete(k),
  } });
  const source = readFileSync(path.join(__dirname, "../lib/session.ts"), "utf8").replace(/^import .*;\n/gm, "").replace(/export /g, "");
  vm.runInContext(stripTypeScriptTypes(source) + "\nglobalThis.api = { saveSession, loadSession, clearSession };", context);
  await context.api.saveSession({ token: "token", email: "email", pwPublicKey: "public", pwPrivateKey: "raw-private", pwSalt: "salt", pwEncryptedPrivateKey: "encrypted" });
  assert.equal(data.has("vx_pw_pk"), false);
  assert.equal(data.get("vx_auth").includes("raw-private"), false);
  assert.equal((await context.api.loadSession()).pwPrivateKey, "");
  await context.api.clearSession();
  assert.equal(data.size, 0);
});
