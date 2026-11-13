const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadScripts } = require('./helpers');

const root = path.join(__dirname, '..');

function setup() {
  return loadScripts([
    'practice/data/unit1.js',
    'practice/data/unit2.js',
    'practice/data/unit3.js',
    'practice/data/unit4.js',
    'practice/data/unit5.js',
    'practice/data/unit6.js',
    'practice/data/registry.js',
    'practice/mastery.js',
    'practice/badges.js',
    'assets/review-list.js'
  ]);
}

test('needs review lists only words in the review state, grouped by unit', () => {
  const { window } = setup();
  const M = window.Mastery;
  const R = window.PracticeRegistry;
  M.markWrong('unit1:adopt');
  M.markCorrect('unit1:donate');
  M.markCorrect('unit1:donate');
  M.markCorrect('unit1:donate');
  M.markWrong('unit2:earthquake');
  const groups = window.ReviewList.groups(R, M, {
    practicePage: 'practice/letters/',
    cardPrefix: ''
  });
  const unit1 = groups.find(g => g.id === 'unit1');
  const unit2 = groups.find(g => g.id === 'unit2');
  assert.ok(unit1);
  assert.equal([...unit1.words].map(w => w.key).join(','), 'unit1:adopt');
  assert.equal(unit1.words[0].en, 'adopt a pet');
  assert.equal(unit1.words[0].zh, '領養寵物');
  assert.match(unit1.words[0].href, /practice\/letters\/\?unit=unit1&focus=unit1%3Aadopt/);
  assert.equal(groups.some(g => g.words.some(w => w.key === 'unit1:donate')), false);
  assert.match(unit2.words[0].href, /practice\/letters\/\?unit=unit2&focus=unit2%3Aearthquake/);
  assert.equal(unit2.words[0].zh.length > 0, true);
});

test('an empty mastery store has no review groups', () => {
  const { window } = setup();
  assert.equal(window.ReviewList.groups(window.PracticeRegistry, window.Mastery).length, 0);
});

test('every badge states exactly how to unlock it', () => {
  const { window } = setup();
  const byId = {};
  window.Badges.catalog().forEach(b => { byId[b.id] = b.detail; });
  assert.equal(byId.starter, 'Finish any one practice, including Grammar.');
  assert.equal(byId['letters-phrase'], 'Finish 3 different Missing Letters sets, all correct each time.');
  assert.equal(byId['match-pro'], 'Finish 3 different Memory Match sets.');
  assert.equal(byId['timed-brave'], 'Finish 3 different Timed Challenge sets.');
  assert.equal(byId['hard-challenger'], 'Finish 3 different Fill Hard sets and 3 different Letters Hard sets, each at least 90% correct.');
  assert.equal(byId['all-rounder'], 'Finish Fill, Letters, Match, and Timed once each, in the same book or in Mixed topic.');
  assert.equal(byId['grammar-story'], 'Finish 3 different Story Book sets.');
  assert.equal(byId['grammar-join'], 'Finish 3 different Join the sentences sets.');
  assert.equal(byId['grammar-chat'], 'Finish 3 different Chat Quest sets.');
  assert.equal(byId['grammar-inference'], 'Get the Chat Quest mystery right 3 times.');
  assert.equal(byId['grammar-boss'], 'Clear Boss Round with at least 1 life left.');
  assert.equal(byId['review-clear'], undefined);
  assert.equal(byId['unit-done:unit1'], undefined);
});

test('homepage hides the review progress block and the needs-review word list', () => {
  const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const hub = fs.readFileSync(path.join(root, 'practice/index.html'), 'utf8');
  const badges = fs.readFileSync(path.join(root, 'badges/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'assets/site.css'), 'utf8');
  assert.doesNotMatch(home, /id="review-progress"/);
  assert.doesNotMatch(home, /Review progress/);
  assert.doesNotMatch(home, /practiceProgress/);
  assert.doesNotMatch(home, /mastered \/ total/);
  assert.doesNotMatch(home, /review-list\.js/);
  assert.doesNotMatch(home, /appendWords/);
  assert.doesNotMatch(home, /id="needs-review"/);
  assert.doesNotMatch(hub, /id="needs-review"/);
  const badgeScript = fs.readFileSync(path.join(root, 'practice/badges.js'), 'utf8');
  assert.match(badges, /renderGrid/);
  assert.match(badgeScript, /badge-how/);
  assert.match(badgeScript, /badge\.detail/);
  assert.doesNotMatch(badges, /index\.html#needs-review/);
  assert.doesNotMatch(badges, /review-clear/);
  assert.doesNotMatch(badges, /badge-unit/);
  assert.doesNotMatch(badges, /'Locked'/);
  const how = css.slice(css.indexOf('.badge-how {'), css.indexOf('.badge-how a'));
  assert.match(how, /color:\s*var\(--navy\)/);
  assert.doesNotMatch(how, /border:\s*[1-9]/);
});
