const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const vm = require("node:vm");
const path = require("node:path");
const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");

test("sign-in stays locked, unlock requests share one modal and reuse the in-memory key", async () => {
  const slots = [], effects = [];
  let cursor = 0, derives = 0;
  const React = {
    createContext: () => ({ Provider: "provider" }),
    createElement: (type, props, ...children) => ({ type, props, children }),
    useContext: () => {},
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; },
    useRef: value => { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useEffect: effect => { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(effect); } },
  };
  const user = { email: "mila@example.test", pw_public_key: "public", pw_encrypted_private_key: "cipher", pw_private_key_nonce: "nonce", pw_salt: "salt" };
  const mocks = {
    react: { __esModule: true, default: React, ...React },
    "./instant": { db: { auth: { signInWithMagicCode: async () => {}, signOut: async () => {} }, getAuth: async () => ({ refresh_token: "instant-token" }) } },
    "./api": { bearer: token => ({ Authorization: token }), api: { auth: { token: { mint: { $post: async () => ({ ok: true, json: async () => ({ token: "token" }) }) } } }, extension: { me: { $get: async () => ({ ok: true, json: async () => ({ user }) }) } } } },
    "./crypto": { deriveMasterKey: async password => { derives++; return new Uint8Array([password === "correct" ? 1 : 0]); }, decryptPrivateKey: async (_, __, key) => { if (!key[0]) throw Error("incorrect"); return "private"; } },
    "./session": { loadSession: async () => null, saveSession: async () => {}, clearSession: async () => {} },
    "./autofill": { clearAutofill: () => {} },
    "@/components/unlock-dialog": { UnlockDialog: "unlock-dialog" },
  };
  const context = vm.createContext({ exports: {}, require: name => { assert.ok(mocks[name], name); return mocks[name]; } });
  const source = readFileSync(path.join(__dirname, "../lib/auth.tsx"), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const render = () => { cursor = 0; const tree = context.exports.AuthProvider({ children: null }); while (effects.length) effects.shift()(); return tree; };
  render(); await new Promise(resolve => setImmediate(resolve));
  let tree = render();
  await tree.props.value.verifyCode("email", "123456");
  tree = render();
  assert.equal(tree.props.value.session.pwPrivateKey, "");
  assert.equal(derives, 0);
  const first = tree.props.value.requestUnlock();
  const second = tree.props.value.requestUnlock();
  tree = render();
  assert.equal(tree.children[1].props.visible, true);
  await assert.rejects(() => tree.props.value.unlock("wrong"));
  assert.equal(render().props.value.session.pwPrivateKey, "");
  await tree.props.value.unlock("correct");
  assert.equal(await first, true); assert.equal(await second, true);
  tree = render();
  assert.equal(tree.props.value.session.pwPrivateKey, "private");
  assert.equal(tree.children[1].props.visible, false);
  assert.equal(await tree.props.value.requestUnlock(), true);
  assert.equal(derives, 2);
});
