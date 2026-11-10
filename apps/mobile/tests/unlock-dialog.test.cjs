const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");

test("unlock dialog prevents empty/duplicate submissions, reports errors and clears secrets when closed", async () => {
  const states = [], effects = [];
  let index = 0;
  const React = {
    createElement: (type, props) => ({ type, props }),
    useState: initial => { const i = index++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === "function" ? value(states[i]) : value; }]; },
    useEffect: fn => effects.push(fn),
  };
  const context = vm.createContext({ React, Error, exports: {}, require: name => name === "react" ? React : { UnlockDialogContent: "Content" } });
  const source = readFileSync(path.join(__dirname, "../components/unlock-dialog.tsx"), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  let calls = 0, reject;
  const props = { visible: true, onCancel() {}, onUnlock: () => { calls++; return new Promise((resolve, fail) => { reject = fail; }); } };
  const render = () => { index = 0; const result = context.exports.UnlockDialog(props); effects.splice(0).forEach(fn => fn()); return result.props; };
  let view = render(); await view.submit(); assert.equal(calls, 0);
  view.setPassword("secret"); view = render(); const pending = view.submit();
  view = render(); assert.equal(view.busy, true); await view.submit(); assert.equal(calls, 1);
  reject(new Error("incorrect")); await pending;
  view = render(); assert.match(view.error, /incorrect/); assert.equal(view.busy, false);
  view.setVisiblePassword(true); props.visible = false; render(); view = render();
  assert.equal(view.password, ""); assert.equal(view.error, ""); assert.equal(view.visiblePassword, false);
});
