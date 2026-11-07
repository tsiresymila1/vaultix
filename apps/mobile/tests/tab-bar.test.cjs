const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");
test("tabs align one icon with its label, preserve navigation events and hide for keyboard", () => {
  let keyboard = false, prevented = false;
  const listeners = {}, calls = [];
  const React = { createElement: (type, props, ...children) => ({ type, props, children }),
    useState: () => [keyboard, value => keyboard = value], useEffect: fn => fn() };
  const modules = {
    react: React, "expo-router": { Tabs: Object.assign(() => {}, { Screen: "Screen" }) },
    "react-native": { View: "View", Pressable: "Pressable", Keyboard: { addListener: (name, fn) => { listeners[name] = fn; return { remove() {} }; } } },
    "lucide-react-native": { KeyRound: "Key", Vault: "Vault", Settings: "Settings" },
    "@/components/ui/text": { Text: "Text" }, "@/lib/theme": { colors: {} },
  };
  const context = vm.createContext({ React, exports: {}, require: name => modules[name] });
  const source = readFileSync(path.join(__dirname, "../app/(app)/(tabs)/_layout.tsx"), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  const props = { state: { index: 0, routes: ["passwords", "index", "settings"].map(name => ({ name, key: name })) },
    insets: { bottom: 24, left: 0, right: 0 }, navigation: { emit: () => ({ defaultPrevented: prevented }), navigate: name => calls.push(name) } };
  const tabs = context.exports.default();
  const bar = tabs.props.tabBar(props);
  assert.equal(bar.props.style.flexDirection, "row");
  assert.equal(bar.props.style.paddingBottom, 24);
  const buttons = bar.children[0];
  assert.equal(buttons.length, 3);
  for (const button of buttons) {
    const style = button.props.style({ pressed: false });
    assert.equal(style.flex, 1); assert.equal(style.alignItems, "center");
    assert.equal(button.children.length, 2);
    assert.equal(button.children[0].props.style.alignItems, "center");
    assert.equal(button.children[1].type, "Text");
  }
  buttons[1].props.onPress(); assert.deepEqual(calls, ["index"]);
  prevented = true; buttons[2].props.onPress(); assert.deepEqual(calls, ["index"]);
  listeners.keyboardDidShow(); assert.equal(context.exports.default().props.tabBar(props), null);
});
