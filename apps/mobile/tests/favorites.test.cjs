const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { stripTypeScriptTypes } = require("node:module");
const vm = require("node:vm");
const path = require("node:path");

function setup(read) {
  const slots = [], writes = [], effects = [];
  let cursor = 0;
  const context = vm.createContext({
    useAuth: () => ({ session: { email: "mila@example.test" } }),
    useState: value => { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => slots[i] = value]; },
    useRef: value => { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useEffect: effect => { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(effect); } },
    SecureStore: { getItemAsync: read, setItemAsync: async (key, value) => { writes.push({ key, value }); } },
  });
  const source = readFileSync(path.join(__dirname, "../lib/favorites.ts"), "utf8").replace(/^import .*;\n/gm, "").replace(/export /g, "");
  vm.runInContext(stripTypeScriptTypes(source) + "\nglobalThis.hook = useFavorites;", context);
  const render = () => { cursor = 0; const result = context.hook(); while (effects.length) effects.shift()(); return result; };
  return { render, writes };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("favorites load and rapid changes persist in order for the current account", async () => {
  const state = setup(async () => '["first"]');
  state.render(); await flush();
  let hook = state.render();
  assert.equal(hook.ready, true);
  hook.toggle("second"); hook.toggle("first");
  await flush();
  hook = state.render();
  assert.deepEqual(Array.from(hook.ids), ["second"]);
  assert.deepEqual(state.writes.map(write => JSON.parse(write.value)), [["first", "second"], ["second"]]);
  assert.match(state.writes[0].key, /^vaultix\.favorites\.[a-f0-9]+$/);
});
test("unavailable storage does not overwrite existing favorites", async () => {
  const state = setup(async () => { throw Error("unavailable"); });
  state.render(); await flush();
  const hook = state.render();
  assert.equal(hook.ready, false);
  assert.ok(hook.error);
  hook.toggle("new"); await flush();
  assert.deepEqual(state.writes, []);
});
