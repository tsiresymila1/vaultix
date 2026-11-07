const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire, stripTypeScriptTypes } = require("node:module");
const vm = require("node:vm");
const path = require("node:path");
const requireWeb = createRequire(path.resolve(__dirname, "../../web/package.json"));
const sodium = requireWeb("libsodium-wrappers-sumo");
function mobile() {
  const context = vm.createContext({ sodium });
  const source = readFileSync(path.join(__dirname, "../lib/crypto.ts"), "utf8").replace(/^import .*;\n/gm, "").replace(/export /g, "");
  vm.runInContext(stripTypeScriptTypes(source) + "\nglobalThis.api = { deriveMasterKey, decryptPrivateKey, encryptSecret, decryptSecret };", context);
  return context.api;
}
test("mobile decrypts web private keys with UTF-8 passwords and either base64 alphabet", async () => {
  await sodium.ready;
  const api = mobile();
  const password = "Café 🔐 mot de passe";
  const salt = sodium.randombytes_buf(16);
  const master = sodium.crypto_pwhash(32, password, salt, 2, 67108864, 2);
  const nonce = sodium.randombytes_buf(24);
  const privateKey = sodium.randombytes_buf(32);
  const cipher = sodium.crypto_secretbox_easy(privateKey, nonce, master);
  for (const variant of [sodium.base64_variants.ORIGINAL, sodium.base64_variants.URLSAFE_NO_PADDING]) {
    const derived = await api.deriveMasterKey(password, sodium.to_base64(salt, variant));
    assert.deepEqual(Buffer.from(derived), Buffer.from(master));
    const decrypted = await api.decryptPrivateKey(sodium.to_base64(cipher, variant), sodium.to_base64(nonce, variant), derived);
    assert.deepEqual(Buffer.from(sodium.from_base64(decrypted)), Buffer.from(privateKey));
  }
  const wrong = await api.deriveMasterKey("incorrect", sodium.to_base64(salt));
  await assert.rejects(() => api.decryptPrivateKey(sodium.to_base64(cipher), sodium.to_base64(nonce), wrong));
});
