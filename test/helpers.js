const fs = require('fs');
const path = require('path');
const vm = require('vm');

function memoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    }
  };
}

function loadScripts(rels, extras) {
  const localStorage = (extras && extras.localStorage) || memoryStorage();
  const window = {};
  const sandbox = {
    window,
    console,
    localStorage,
    Date,
    Math,
    URLSearchParams,
    location: (extras && extras.location) || { search: '' },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval
  };
  rels.forEach(rel => {
    const file = path.join(__dirname, '..', rel);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInNewContext(code, sandbox, { filename: rel });
  });
  return { window, localStorage, sandbox };
}

function loadPacks() {
  return loadScripts([
    'practice/data/unit1.js',
    'practice/data/unit2.js',
    'practice/data/unit3.js',
    'practice/data/unit4.js',
    'practice/data/unit5.js',
    'practice/data/unit6.js'
  ]);
}

module.exports = { memoryStorage, loadScripts, loadPacks };
