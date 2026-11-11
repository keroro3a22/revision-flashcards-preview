const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const draft = require('../assets/studio-draft.js');
const { memoryStorage } = require('./helpers');

function columnSpecs() {
  const studio = fs.readFileSync('assets/studio.js', 'utf8');
  const start = studio.indexOf('function revisionColumns');
  const end = studio.indexOf('function setColumns');
  return new Function(studio.slice(start, end) + '\nreturn { revisionColumns: revisionColumns, practiceColumns: practiceColumns };')();
}

function fakeDocument(defaults) {
  function queryAll(node, selector) {
    const found = [];
    (node.children || []).forEach(function (child) {
      if (matches(child, selector)) found.push(child);
      queryAll(child, selector).forEach(function (item) { found.push(item); });
    });
    return found;
  }
  function matches(node, selector) {
    if (selector.charAt(0) === '.') return node.className.split(/\s+/).indexOf(selector.slice(1)) !== -1;
    return node.tagName === selector.toLowerCase();
  }
  function El(tag, doc) {
    this.tagName = tag.toLowerCase();
    this.ownerDocument = doc;
    this.children = [];
    this.parent = null;
    this.className = '';
    this.style = { width: '', minWidth: '' };
    this.listeners = {};
    this.attrs = {};
    this._data = {};
    this.type = '';
    this.innerHTML = '';
  }
  El.prototype.appendChild = function (child) {
    if (child.parent) child.parent.children = child.parent.children.filter(function (item) { return item !== child; });
    child.parent = this;
    this.children.push(child);
    return child;
  };
  El.prototype.replaceChildren = function () {
    const nodes = Array.prototype.slice.call(arguments);
    this.children.forEach(function (child) { child.parent = null; });
    this.children = [];
    const parent = this;
    nodes.forEach(function (node) { parent.appendChild(node); });
  };
  El.prototype.querySelector = function (selector) {
    return queryAll(this, selector)[0] || null;
  };
  El.prototype.querySelectorAll = function (selector) {
    return queryAll(this, selector);
  };
  El.prototype.addEventListener = function (type, fn) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(fn);
  };
  El.prototype.removeEventListener = function (type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter(function (item) { return item !== fn; });
  };
  El.prototype.setAttribute = function (name, value) {
    this.attrs[name] = String(value);
  };
  El.prototype.getAttribute = function (name) {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  };
  El.prototype.setPointerCapture = function () {};
  El.prototype.getBoundingClientRect = function () {
    let node = this;
    while (node && node.tagName !== 'table') node = node.parent;
    const key = this._data.key;
    if (!node || !key) return { width: 0 };
    const col = queryAll(node, 'col').filter(function (item) { return item._data.key === key; })[0];
    const inline = col && parseFloat(col.style.width);
    if (inline > 0) return { width: inline };
    return { width: defaults[key] || 0 };
  };
  Object.defineProperty(El.prototype, 'dataset', {
    get: function () {
      const data = this._data;
      return new Proxy(data, {
        set: function (target, key, value) {
          target[key] = String(value);
          return true;
        }
      });
    }
  });
  Object.defineProperty(El.prototype, 'classList', {
    get: function () {
      const el = this;
      return {
        add: function (name) {
          const parts = el.className.split(/\s+/).filter(Boolean);
          if (parts.indexOf(name) === -1) parts.push(name);
          el.className = parts.join(' ');
        },
        remove: function (name) {
          el.className = el.className.split(/\s+/).filter(function (part) { return part && part !== name; }).join(' ');
        },
        contains: function (name) {
          return el.className.split(/\s+/).indexOf(name) !== -1;
        }
      };
    }
  });
  const doc = {};
  doc.createElement = function (tag) { return new El(tag, doc); };
  doc.body = doc.createElement('body');
  return doc;
}

function fire(el, type, extra) {
  const event = Object.assign({
    type: type,
    button: 0,
    clientX: 0,
    pointerId: 1,
    key: '',
    shiftKey: false,
    preventDefault: function () {},
    stopPropagation: function () {}
  }, extra);
  (el.listeners[type] || []).slice().forEach(function (fn) { fn(event); });
}

function harness(defaults) {
  const doc = fakeDocument(defaults);
  const table = doc.createElement('table');
  table.appendChild(doc.createElement('colgroup'));
  const head = doc.createElement('thead');
  table.appendChild(head);
  doc.body.appendChild(table);
  return { doc: doc, table: table, head: head };
}

function column(table, key) {
  return table.querySelectorAll('col').filter(function (col) { return col.dataset.key === key; })[0];
}

function handle(table, label) {
  return table.querySelectorAll('button').filter(function (button) {
    return button.getAttribute('aria-label') === label;
  })[0];
}

const place = { kind: 'vocab', mode: 'fill', difficulty: 'easy' };

test('column widths are stored for one table shape and leave the place alone', () => {
  const storage = memoryStorage();
  storage.setItem(draft.STUDIO_PLACE_KEY, '{"unit":"unit3"}');

  assert.equal(draft.writeColumnWidth(storage, 'revision', 'en', 180.4), 180);
  assert.equal(draft.writeColumnWidth(storage, 'grammar', 'pattern', 30), 48);
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), { en: 180 });
  assert.deepEqual(draft.shapeWidths(storage, 'grammar'), { pattern: 48 });
  assert.equal(storage.getItem(draft.STUDIO_PLACE_KEY), '{"unit":"unit3"}');

  draft.clearColumnWidth(storage, 'revision', 'en');
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), {});
  assert.deepEqual(draft.shapeWidths(storage, 'grammar'), { pattern: 48 });
});

test('a bad width record is ignored and a drag stays inside the limits', () => {
  const storage = memoryStorage();
  storage.setItem(draft.STUDIO_WIDTH_KEY, 'not-json');
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), {});
  storage.setItem(draft.STUDIO_WIDTH_KEY, JSON.stringify({ revision: ['en'], fill: { easy: 10, options: 9000 } }));
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), {});
  assert.deepEqual(draft.shapeWidths(storage, 'fill'), {});

  assert.equal(draft.dragColumnWidth(112, 40), 152);
  assert.equal(draft.dragColumnWidth(112, -1000), 48);
  assert.equal(draft.dragColumnWidth(3900, 500), 4000);
  assert.equal(draft.dragColumnWidth('nope', 0), 48);
});

test('every studio column has its own width key', () => {
  const columns = columnSpecs();
  assert.deepEqual(columns.revisionColumns(place).columns.map(function (column) { return column.key; }), [
    'num', 'photo', 'en', 'zh', 'pos', 'syllables', 'example', 'advanced', 'state', 'actions'
  ]);
  assert.deepEqual(columns.revisionColumns(Object.assign({}, place, { kind: 'grammar' })).columns.map(function (column) { return column.key; }), [
    'num', 'photo', 'en', 'zh', 'pos', 'pattern', 'note', 'example', 'advanced', 'state', 'actions'
  ]);
  assert.deepEqual(columns.practiceColumns(Object.assign({}, place, { mode: 'letters' })).columns.map(function (column) { return column.key; }), [
    'num', 'word', 'easy', 'hard', 'state', 'actions'
  ]);
  assert.deepEqual(columns.practiceColumns(Object.assign({}, place, { mode: 'match' })).columns.map(function (column) { return column.key; }), [
    'num', 'en', 'picture', 'state', 'actions'
  ]);
  assert.deepEqual(columns.practiceColumns(place).columns.map(function (column) { return column.key; }), [
    'num', 'easy', 'hard', 'options', 'state', 'actions'
  ]);
  assert.deepEqual(columns.practiceColumns(Object.assign({}, place, { kind: 'grammar', mode: 'story' })).columns.map(function (column) { return column.key; }), [
    'num', 'prompt', 'answer', 'explain', 'options', 'hard', 'state', 'actions'
  ]);
  assert.deepEqual(columns.practiceColumns(Object.assign({}, place, { mode: 'timed' })).columns.map(function (column) { return column.key; }), [
    'num', 'prompt', 'answer', 'explain', 'options', 'state', 'actions'
  ]);
});

test('dragging a header handle resizes that column and remembers it', () => {
  const storage = memoryStorage();
  const view = harness({ num: 38, photo: 86, en: 112, zh: 112, pos: 112, syllables: 112, example: 280, advanced: 280, state: 70, actions: 82 });
  const columns = [
    { col: 'col-num', key: 'num', label: '#' },
    { col: 'col-photo', key: 'photo', label: 'Photo' },
    { col: 'col-text', key: 'en', label: 'English' },
    { col: 'col-text', key: 'zh', label: '中文' },
    { col: 'col-text', key: 'pos', label: 'Part of speech' },
    { col: 'col-text', key: 'syllables', label: 'Syllables' },
    { col: 'col-pair', key: 'example', label: 'Example<br>例句' },
    { col: 'col-pair', key: 'advanced', label: 'Advanced<br>進階例句' },
    { col: 'col-state', key: 'state', label: 'State' },
    { col: 'col-actions', key: 'actions', label: '' }
  ];
  draft.mountStudioColumns(view.table, view.head, columns, 'revision', storage);
  assert.equal(view.table.dataset.shape, 'revision');
  assert.equal(column(view.table, 'en').className, 'col-text');
  assert.equal(column(view.table, 'en').style.width, '');
  assert.equal(view.table.style.width, '');
  const english = handle(view.table, 'Resize English');
  assert.equal(english.type, 'button');
  assert.equal(english.className.indexOf('studio-col-resize') !== -1, true);
  assert.equal(handle(view.table, 'Resize Example 例句').getAttribute('aria-label'), 'Resize Example 例句');
  assert.equal(handle(view.table, 'Resize actions').getAttribute('aria-label'), 'Resize actions');

  fire(english, 'pointerdown', { clientX: 20 });
  fire(english, 'pointerup', { clientX: 20 });
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), {});

  fire(english, 'pointerdown', { clientX: 20 });
  fire(english, 'pointermove', { clientX: 60 });
  assert.equal(column(view.table, 'en').style.width, '152px');
  assert.equal(column(view.table, 'zh').style.width, '112px');
  assert.equal(view.doc.body.classList.contains('studio-col-dragging'), true);
  fire(english, 'pointerup', { clientX: 60 });
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), { en: 152 });
  assert.equal(view.table.style.width, '1324px');
  assert.equal(view.table.style.minWidth, '1324px');
  assert.equal(view.doc.body.className.indexOf('studio-col-dragging') === -1, true);

  fire(english, 'keydown', { key: 'ArrowRight' });
  assert.equal(draft.shapeWidths(storage, 'revision').en, 160);

  const again = harness({ num: 38, photo: 86, en: 112, zh: 112, pos: 112, syllables: 112, example: 280, advanced: 280, state: 70, actions: 82 });
  draft.mountStudioColumns(again.table, again.head, columns, 'revision', storage);
  assert.equal(column(again.table, 'en').style.width, '160px');
  assert.equal(column(again.table, 'zh').style.width, '112px');

  fire(handle(again.table, 'Resize English'), 'dblclick', {});
  assert.deepEqual(draft.shapeWidths(storage, 'revision'), {});
  assert.equal(column(again.table, 'en').style.width, '');
  assert.equal(again.table.style.width, '');

  draft.writeColumnWidth(storage, 'grammar', 'en', 240);
  draft.mountStudioColumns(again.table, again.head, columns, 'revision', storage);
  assert.equal(column(again.table, 'en').style.width, '');
  assert.equal(draft.shapeWidths(storage, 'grammar').en, 240);
});

test('the studio header uses the resize handle without clipping the page scroll', () => {
  const studio = fs.readFileSync('assets/studio.js', 'utf8');
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  assert.match(studio, /mountStudioColumns\(\$\('studio-table'\), \$\('studio-head'\)/);
  assert.match(css, /\.studio-col-resize \{[^}]*cursor: col-resize/);
  assert.match(css, /\.studio-scroll \{ overflow: visible/);
  assert.doesNotMatch(css, /\.studio-scroll \{[^}]*overflow-x:\s*auto/);
});
