const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const vm = require("node:vm");
const ts = createRequire(path.resolve(__dirname, "../package.json"))("typescript");
const element = (type, props, ...children) => ({ type, props: props ?? {}, children });
function load(file, modules, React) {
  const context = vm.createContext({ React, exports: {}, require: name => { if (!(name in modules)) throw new Error(`Missing mock ${name}`); return modules[name]; } });
  const source = readFileSync(path.join(__dirname, "../", file), "utf8");
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  return context.exports;
}
const walk = node => !node || typeof node !== "object" ? [] : [node, ...(node.children ?? []).flat(Infinity).flatMap(walk)];

test("native input does not echo typing; generated values, clearing and OTP sanitizing update the native buffer", () => {
  let ref, lastNativeValue; const writes = [], changes = [];
  const React = { createElement: element, useRef: initial => ref ??= { current: initial }, useEffect: fn => fn() };
  const Field = Object.assign(() => {}, { Placeholder: "Placeholder" });
  const nativeState = { set: value => { lastNativeValue = value; writes.push(value); } };
  const modules = { react: React, "react-native": { View: "View" },
    "@expo/ui/jetpack-compose": { Host: "Host", OutlinedTextField: Field, Text: "Text", Shape: { RoundedCorner: value => value }, useNativeState: () => nativeState },
    "@expo/ui/jetpack-compose/modifiers": { fillMaxWidth: () => ({}), semantics: value => value },
    "@/lib/theme": { colors: {} }, "@/lib/utils": { cn: (...values) => values.join(" ") } };
  const { Input } = load("components/ui/input.android.tsx", modules, React);
  const props = { value: "", secureTextEntry: true, onChangeText: value => changes.push(value) };
  const field = () => walk(Input(props)).find(node => node.type === Field);
  let control = field(); assert.equal(control.props.visualTransformation, "password");
  control.props.onValueChange("typed"); props.value = "typed"; field(); assert.deepEqual(writes, []);
  props.value = "generated-password"; field(); assert.equal(lastNativeValue, "generated-password");
  props.value = ""; field(); assert.equal(lastNativeValue, "");
  props.normalize = value => value.replace(/[^0-9]/g, "");
  field().props.onValueChange("x"); assert.equal(lastNativeValue, ""); assert.equal(changes.at(-1), "");
  props.editable = false; assert.equal(field().props.enabled, false);
});

test("native buttons keep stable geometry and disable the native action while saving", () => {
  const React = { createElement: element };
  const modules = { "react-native": { View: "View" },
    "@expo/ui/jetpack-compose": { Host: "Host", Button: "FilledButton", TextButton: "TextButton", OutlinedButton: "OutlinedButton", RNHostView: "RNHostView", FilledIconButton: "FilledIconButton", IconButton: "IconButton", OutlinedIconButton: "OutlinedIconButton" },
    "@expo/ui/jetpack-compose/modifiers": { clickable: onClick => ({ onClick }), fillMaxSize: () => ({}), semantics: value => value },
    "./text": { Text: "Text", TextClassContext: { Provider: "TextProvider" } },
    "@/lib/theme": { colors: { primary: "green", destructive: "red" } }, "@/lib/utils": { cn: (...values) => values.join(" ") } };
  const { Button } = load("components/ui/button.android.tsx", modules, React);
  let calls = 0;
  const tree = Button({ size: "icon", loading: true, onPress: () => calls++ });
  const view = walk(tree).find(node => node.type === "View");
  assert.equal(view.props.style[0].width, 48); assert.equal(view.props.style[0].height, 48);
  const action = walk(tree).find(node => node.type === "FilledIconButton"); assert.equal(action.props.enabled, false);
  const idle = walk(Button({ onPress: () => calls++ })).find(node => node.type === "FilledButton");
  assert.equal(idle.props.enabled, true); idle.props.onClick(); assert.equal(calls, 1);
  const content = walk(Button({ onPress: () => calls++ })).find(node => node.type === "RNHostView");
  content.props.modifiers[0].onClick(); assert.equal(calls, 2);
  const disabledContent = walk(Button({ disabled: true, onPress: () => calls++ })).find(node => node.type === "RNHostView");
  disabledContent.props.modifiers[0].onClick(); assert.equal(calls, 2);
  assert.ok(walk(Button({ variant: "outline" })).some(node => node.type === "OutlinedButton"));
});

test("native lists retain refresh for empty content and apply padding once", async () => {
  const React = { createElement: element, Children: { toArray: children => (children ?? []).flat(Infinity).filter(Boolean) } };
  const modules = { react: React, "react-native": { View: "View", StyleSheet: { flatten: value => value } },
    "@expo/ui/jetpack-compose": Object.fromEntries(["Host", "LazyColumn", "LazyRow", "PullToRefreshBox", "RNHostView"].map(name => [name, name])),
    "@expo/ui/jetpack-compose/modifiers": { fillMaxSize: () => ({}), fillMaxWidth: () => ({}) }, "@/lib/theme": { colors: {} } };
  const { ScreenScroll } = load("components/ui/screen-scroll.android.tsx", modules, React);
  let calls = 0;
  const nodes = walk(ScreenScroll({ children: [], refreshing: true, onRefresh: async () => calls++, contentContainerStyle: { paddingHorizontal: 24, paddingBottom: 12, gap: 22 } }));
  const refresh = nodes.find(node => node.type === "PullToRefreshBox");
  assert.equal(refresh.props.isRefreshing, true); refresh.props.onRefresh(); await Promise.resolve(); assert.equal(calls, 1);
  const list = nodes.find(node => node.type === "LazyColumn");
  assert.equal(list.props.contentPadding.start, 24); assert.equal(list.props.contentPadding.bottom, 12);
  assert.equal(list.children[0].length, 0);
  assert.equal(list.props.verticalArrangement.spacedBy, 22);
  assert.ok(walk(ScreenScroll({ horizontal: true })).some(node => node.type === "LazyRow"));
});

test("mobile screens have no remaining React Native interactive controls", () => {
  const { readdirSync } = require("node:fs");
  const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.name.endsWith(".tsx") ? [path.join(directory, entry.name)] : []);
  for (const file of files(path.join(__dirname, "../app"))) {
    const source = readFileSync(file, "utf8");
    const nativeImports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']react-native["']/g)].map(match => match[1]).join(" ");
    assert.doesNotMatch(nativeImports, /\b(Pressable|TouchableOpacity|TextInput|ActivityIndicator|SectionList|FlatList|RefreshControl|ScrollView|Modal)\b/, file);
  }
});
