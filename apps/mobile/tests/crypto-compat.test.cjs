const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire, stripTypeScriptTypes } = require("node:module");
const vm = require("node:vm");
const path = require("node:path");
const requireWeb = createRequire(path.resolve(__dirname, "../../web/package.json"));
const sodium = requireWeb("libsodium-wrappers-sumo");
function mobile(provider = sodium) {
  const context = vm.createContext({ sodium: provider });
  const source = readFileSync(path.join(__dirname, "../lib/crypto.ts"), "utf8").replace(/^import .*;\n/gm, "").replace(/export /g, "");
  vm.runInContext(stripTypeScriptTypes(source) + "\nglobalThis.api = { deriveMasterKey, decryptPrivateKey, encryptSecret, decryptSecret, sealKey, unsealKey, generateEntryKey };", context);
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

// Exercise the actual native JS adapter, including its argument validation.
function nativeAead() {
  const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");
  const source = readFileSync(path.join(__dirname, "../node_modules/react-native-libsodium/src/lib.native.ts"), "utf8");
  const functions = source.slice(source.indexOf("export function crypto_aead_xchacha20poly1305_ietf_encrypt("), source.indexOf("export function _unstable_crypto_kdf_hkdf_sha256_extract("));
  const bytes = value => new Uint8Array(value);
  const buffer = value => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  const context = vm.createContext({ exports: {}, Uint8Array, ArrayBuffer,
    toArrayBuffer: buffer, convertToOutputFormat: bytes,
    global: {
      jsi_crypto_aead_xchacha20poly1305_ietf_encrypt: (message, ad, nonce, key) => buffer(sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(typeof message === "string" ? message : bytes(message), ad, null, bytes(nonce), bytes(key))),
      jsi_crypto_aead_xchacha20poly1305_ietf_decrypt: (cipher, ad, nonce, key) => buffer(sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, bytes(cipher), ad, bytes(nonce), bytes(key))),
    },
  });
  vm.runInContext(ts.transpileModule(functions, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { ...sodium, ...context.exports };
}
test("native adapter reveals owned/shared web entries and writes content readable by the web", async () => {
  await sodium.ready;
  const api = mobile(nativeAead());
  const owner = sodium.crypto_box_keypair(), recipient = sodium.crypto_box_keypair();
  const key = sodium.randombytes_buf(32), nonce = sodium.randombytes_buf(24);
  const plain = "Mon mot de passe 🔐 éà!";
  const cipher = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plain, null, null, nonce, key);
  for (const pair of [owner, recipient]) {
    const sealed = sodium.crypto_box_seal(key, pair.publicKey);
    const entryKey = await api.unsealKey(sodium.to_base64(sealed), sodium.to_base64(pair.publicKey), sodium.to_base64(pair.privateKey));
    assert.equal(await api.decryptSecret(sodium.to_base64(cipher), sodium.to_base64(nonce), entryKey), plain);
    const mobileCipher = await api.encryptSecret(plain, entryKey);
    const opened = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, sodium.from_base64(mobileCipher.cipher), null, sodium.from_base64(mobileCipher.nonce), key);
    assert.equal(sodium.to_string(opened), plain);
  }
  const corrupted = new Uint8Array(cipher); corrupted[0] ^= 1;
  await assert.rejects(() => api.decryptSecret(sodium.to_base64(corrupted), sodium.to_base64(nonce), sodium.to_base64(key)));
});
