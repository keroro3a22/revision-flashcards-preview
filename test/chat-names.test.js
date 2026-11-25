const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ChatNames = require('../practice/grammar/chat-names.js');

const root = path.join(__dirname, '..');
const grammar = path.join(root, 'practice', 'grammar');
const units = {
  unit1: { amy: 'Amy', tom: 'Tom', miss: 'Miss Chan' },
  unit2: { amy: 'Amy', ken: 'Ken', miss: 'Miss Wong' },
  unit3: { mia: 'Mia', leo: 'Leo', chef: 'Chef Chan' },
  unit4: { sam: 'Sam', amy: 'Amy', miss: 'Miss Chan' },
  unit5: { ben: 'Ben', lily: 'Lily', miss: 'Miss Ho' },
  unit6: { tom: 'Tom', may: 'May', mr: 'Mr Tam' }
};
const known = ['amy', 'tom', 'miss', 'ken', 'leo', 'sam', 'mia', 'chef', 'ben', 'lily', 'may', 'mr'];

function read(name) {
  return fs.readFileSync(path.join(grammar, name), 'utf8');
}

test('a stored name wins, then the unit map, then a title-cased speaker', () => {
  assert.equal(ChatNames.display({ speaker: 'miss', name: 'Ms Lee' }, units.unit1), 'Ms Lee');
  assert.equal(ChatNames.display({ speaker: 'miss', who: 'Ms Lee' }, units.unit1), 'Ms Lee');
  assert.equal(ChatNames.display({ speaker: 'ken', name: '   ' }, units.unit1), 'Ken');
  assert.equal(ChatNames.display({ speaker: 'miss' }, units.unit1), 'Miss Chan');
  assert.equal(ChatNames.display({ speaker: 'miss' }, units.unit2), 'Miss Wong');
  assert.equal(ChatNames.display({ speaker: 'miss' }, units.unit5), 'Miss Ho');
  assert.equal(ChatNames.display({ speaker: 'chef' }, units.unit3), 'Chef Chan');
  assert.equal(ChatNames.display({ speaker: 'mr' }, units.unit6), 'Mr Tam');
  ['ken', 'may', 'ben', 'lily', 'jess', 'sam', 'leo', 'tom', 'jade', 'rita', 'ruby'].forEach((key) => {
    const expected = key.charAt(0).toUpperCase() + key.slice(1);
    assert.equal(ChatNames.display({ speaker: key }, units.unit1), expected, key);
    assert.equal(ChatNames.display({ speaker: key.toUpperCase() }, {}), expected, key);
  });
  assert.equal(ChatNames.display({}, units.unit1), 'Someone');
  assert.notEqual(ChatNames.display({ speaker: 'jade' }, units.unit2), 'undefined');
  assert.equal(ChatNames.who({ name: 'Ken <3' }, {}), 'Ken &lt;3');
  assert.equal(ChatNames.display({ name: 'Ken <3' }, {}), 'Ken <3');
});

test('known characters keep their bubble class and new speakers get one stable guest style', () => {
  const css = read('grammar.css');
  known.forEach((key) => {
    const el = { className: '' };
    ChatNames.paint(el, { speaker: key }, 'active-bubble');
    assert.equal(el.className, 'bubble ' + key + ' active-bubble', key);
    assert.match(css, new RegExp('\\.bubble\\.' + key + ' \\{[^}]*align-self:\\s*flex-(start|end)'));
    assert.match(css, new RegExp('\\.bubble\\.' + key + ' \\{[^}]*background:\\s*var\\(--bubble-' + key + '\\)'));
  });
  const guestCss = read('chat-names.css');
  ['jess', 'jade', 'rita', 'ruby'].forEach((key) => {
    const first = { className: '' };
    const again = { className: '' };
    ChatNames.paint(first, { speaker: key });
    ChatNames.paint(again, { speaker: key.toUpperCase() });
    assert.equal(again.className, first.className, key);
    assert.match(first.className, /^bubble guest-(start|end) guest-tone-[0-7]$/, key);
    assert.doesNotMatch(first.className, new RegExp('\\b' + key + '\\b'));
  });
  assert.match(guestCss, /\.bubble\.guest-start[\s\S]*align-self:\s*flex-start/);
  assert.match(guestCss, /\.bubble\.guest-end[\s\S]*align-self:\s*flex-end/);
  assert.match(guestCss, /background:\s*var\(--bubble-amy\)/);
  assert.match(guestCss, /background:\s*var\(--bubble-chef\)/);
  const ruby = { className: '' };
  const jess = { className: '' };
  ChatNames.paint(ruby, { speaker: 'ruby' });
  ChatNames.paint(jess, { speaker: 'jess' });
  assert.notEqual(ruby.className, jess.className);
});

test('every unit chat page resolves names with the shared helper', () => {
  Object.keys(units).forEach((unit) => {
    const html = read(unit + '-chat/index.html');
    assert.match(html, /chat-names\.css\?v=1/, unit);
    assert.match(html, /chat-names\.js\?v=1/, unit);
    assert.match(html, /grammar-live\.js\?v=4/, unit);
    assert.match(html, new RegExp("GrammarLive\\.load\\(\\{ unit: '" + unit + "', mode: 'chat' \\}\\)"), unit);
    assert.equal((html.match(/ChatNames\.who\(b, names\)/g) || []).length, 3, unit);
    assert.equal((html.match(/ChatNames\.display\(bubbles\[idx\], names\)/g) || []).length, 1, unit);
    assert.equal((html.match(/ChatNames\.paint\(d, b\)/g) || []).length, 2, unit);
    assert.equal((html.match(/ChatNames\.paint\(d, b, "active-bubble"\)/g) || []).length, 1, unit);
    assert.doesNotMatch(html, /names\[b\.speaker\]/, unit);
    assert.doesNotMatch(html, /names\[bubbles/, unit);
  });
});
