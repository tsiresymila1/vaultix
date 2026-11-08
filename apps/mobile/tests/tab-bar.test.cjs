const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");
test("iOS uses the native tab navigator with the same routes and labels", () => {
  const React = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const Trigger = Object.assign(() => {}, { Icon: "Icon", Label: "Label" });
  const NativeTabs = Object.assign(() => {}, { Trigger });
  const context = vm.createContext({ React, exports: {}, require: name => name === "expo-router/unstable-native-tabs" ? { NativeTabs } : { colors: {} } });
  const source = readFileSync(path.join(__dirname, "../app/(app)/(tabs)/_layout.tsx"), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const tree = context.exports.default();
  assert.equal(tree.type, NativeTabs);
  assert.equal(context.exports.unstable_settings.initialRouteName, "passwords");
  assert.deepEqual(tree.children.map(child => child.props.name), ["passwords", "index", "settings"]);
  assert.deepEqual(tree.children.map(child => child.children[1].children[0]), ["Identifiants", "Coffres", "Réglages"]);
});

test("Android uses the Material navigation row, three labelled items and cancelable tab events", () => {
  let keyboard = false, prevented = false;
  const listeners = {}, calls = [];
  const React = { createElement: (type, props, ...children) => ({ type, props, children }),
    useState: () => [keyboard, value => keyboard = value], useEffect: fn => fn() };
  const Item = Object.assign(() => {}, { Icon: "IconSlot", Label: "LabelSlot" });
  const modules = {
    react: React, "expo-router": { Tabs: Object.assign(() => {}, { Screen: "Screen" }) },
    "react-native": { View: "View", Keyboard: { addListener: (name, fn) => { listeners[name] = fn; return { remove() {} }; } } },
    "lucide-react-native": { KeyRound: "Key", Vault: "Vault", Settings: "Settings" },
    "@expo/ui/jetpack-compose": { Host: "Host", NavigationBar: "NavigationBar", NavigationBarItem: Item, RNHostView: "RNHostView", Text: "Text" },
    "@expo/ui/jetpack-compose/modifiers": { fillMaxWidth: () => "fillMaxWidth", size: () => "size" },
    "@/lib/theme": { colors: {} },
  };
  const context = vm.createContext({ React, exports: {}, require: name => modules[name] });
  const source = readFileSync(path.join(__dirname, "../app/(app)/(tabs)/_layout.android.tsx"), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const props = { state: { index: 0, routes: ["passwords", "index", "settings"].map(name => ({ name, key: name })) },
    insets: { bottom: 24, left: 12, right: 8 }, navigation: { emit: () => ({ defaultPrevented: prevented }), navigate: name => calls.push(name) } };
  const bar = context.exports.default().props.tabBar(props);
  assert.equal(bar.props.style.paddingLeft, 12);
  assert.equal(bar.props.style.paddingBottom, undefined); // Compose applies its own system inset.
  const host = bar.children[0];
  assert.equal(host.type, "Host"); assert.equal(host.props.style.width, "100%");
  const nativeBar = host.children[0];
  assert.equal(nativeBar.type, "NavigationBar");
  const items = nativeBar.children[0];
  assert.equal(items.length, 3);
  assert.equal(items[0].props.selected, true);
  for (const item of items) {
    assert.equal(item.type, Item);
    assert.equal(item.children[0].type, "IconSlot");
    assert.equal(item.children[1].type, "LabelSlot");
  }
  items[0].props.onClick(); assert.deepEqual(calls, []);
  items[1].props.onClick(); assert.deepEqual(calls, ["index"]);
  prevented = true; items[2].props.onClick(); assert.deepEqual(calls, ["index"]);
  listeners.keyboardDidShow(); assert.equal(context.exports.default().props.tabBar(props), null);
});
