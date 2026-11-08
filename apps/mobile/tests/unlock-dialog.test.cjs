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

test("Material unlock preserves masking, retry, busy dismissal and action callbacks", () => {
  const changes = [], nativeClears = [];
  const React = { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), useEffect: fn => fn() };
  const slots = name => Object.assign(() => {}, Object.fromEntries(["Title", "Text", "DismissButton", "ConfirmButton", "Label", "TrailingIcon"].map(slot => [slot, `${name}.${slot}`])));
  const modules = {
    react: React,
    "@expo/ui/jetpack-compose": { useNativeState: () => ({ set: value => nativeClears.push(value) }), AlertDialog: slots("Dialog"), OutlinedTextField: slots("Field"), Host: "Host", Column: "Column", Text: "Text", TextButton: "TextButton", Button: "Button" },
    "@expo/ui/jetpack-compose/modifiers": { fillMaxWidth: () => "fillMaxWidth", verticalScroll: () => "verticalScroll" }, "@/lib/theme": { colors: {} },
  };
  const context = vm.createContext({ React, exports: {}, require: name => modules[name] });
  const source = readFileSync(path.join(__dirname, "../components/unlock-dialog-content.android.tsx"), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const props = { visible: true, busy: false, error: "incorrect", password: "secret", visiblePassword: false,
    onCancel: () => changes.push("cancel"), submit: async () => changes.push("submit"), setPassword: value => changes.push(["password", value]),
    setError: value => changes.push(["error", value]), setVisiblePassword: value => changes.push(["visible", typeof value === "function" ? value(false) : value]) };
  const render = () => context.exports.UnlockDialogContent(props);
  const walk = node => !node || typeof node !== "object" ? [] : [node, ...node.children.flat(Infinity).flatMap(walk)];
  let tree = render(), nodes = walk(tree);
  const field = nodes.find(node => node.type === modules["@expo/ui/jetpack-compose"].OutlinedTextField);
  assert.equal(field.props.visualTransformation, "password");
  assert.equal(field.props.keyboardOptions.autoCorrectEnabled, false);
  nodes.find(node => node.type === "Button").props.onClick();
  assert.deepEqual(changes, [["password", ""], ["error", ""], ["visible", false]]);
  changes.length = 0; props.busy = true; tree = render();
  const dialog = tree.children[0]; assert.equal(dialog.props.properties.dismissOnBackPress, false);
  dialog.props.onDismissRequest(); assert.deepEqual(changes, []);
  assert.equal(walk(tree).find(node => node.type === "Button").props.enabled, false);
  props.visible = false; props.password = ""; assert.equal(render(), null); assert.deepEqual(nativeClears, [""]);
});
