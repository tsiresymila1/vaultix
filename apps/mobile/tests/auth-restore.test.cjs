const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup(stored, getInitialUser) {
  const slots = [], effects = [], signIns = [];
  let cursor = 0, cleared = 0, signedIn = false;
  const React = {
    createContext: () => ({ Provider: "provider" }), createElement: (type, props, ...children) => ({ type, props, children }), useContext: () => {},
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => slots[i] = typeof value === "function" ? value(slots[i]) : value]; },
    useRef: value => { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useEffect: fn => { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(fn); } },
  };
  const modules = {
    react: { __esModule: true, default: React, ...React },
    "./instant": { db: { getAuth: () => signedIn ? Promise.resolve({ email: stored.email }) : getInitialUser(), auth: { signInWithToken: async token => { signIns.push(token); signedIn = true; } } } },
    "./session": { loadSession: async () => stored, clearSession: async () => { cleared++; } },
    "./api": {}, "./crypto": {}, "./autofill": { clearAutofill() {} }, "@/components/unlock-dialog": { UnlockDialog: "unlock" },
  };
  const context = vm.createContext({ exports: {}, require: name => modules[name] });
  vm.runInContext(ts.transpileModule(readFileSync(path.join(__dirname, "../lib/auth.tsx"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  return { signIns, cleared: () => cleared, render: () => { cursor = 0; const tree = context.exports.AuthProvider({ children: null }); while (effects.length) effects.shift()(); return tree.props.value; } };
}
const session = { token: "jwt", email: "mila@example.test", pwPublicKey: "public", pwPrivateKey: "", pwSalt: "salt", pwEncryptedPrivateKey: "cipher", pwPrivateKeyNonce: "nonce" };
test("cold start waits for Instant authentication before publishing the local session", async () => {
  let resolveUser;
  const restoredUser = new Promise(resolve => { resolveUser = resolve; });
  const app = setup(session, () => restoredUser);
  assert.equal(app.render().ready, false);
  await flush(); assert.equal(app.render().session, null);
  resolveUser({ email: session.email }); await flush();
  const auth = app.render();
  assert.equal(auth.ready, true); assert.equal(auth.session.email, session.email);
  assert.equal(auth.session.pwPrivateKey, ""); assert.equal(auth.pending.pwSalt, "salt");
});
test("missing Instant session is restored with its saved refresh token", async () => {
  const app = setup({ ...session, instantToken: "instant-refresh" }, async () => null);
  app.render(); await flush();
  assert.equal(app.render().session.email, session.email);
  assert.deepEqual(app.signIns, ["instant-refresh"]);
});
test("orphaned or mismatched local sessions return to login instead of loading forever", async () => {
  for (const user of [null, { email: "someone-else@example.test" }]) {
    const app = setup(session, async () => user);
    app.render(); await flush();
    assert.equal(app.render().ready, true); assert.equal(app.render().session, null); assert.equal(app.cleared(), 1);
  }
});
