const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadScripts } = require('./helpers');

const PACKS = [
  'practice/data/unit1.js',
  'practice/data/unit2.js',
  'practice/data/unit3.js',
  'practice/data/unit4.js',
  'practice/data/unit5.js',
  'practice/data/unit6.js',
  'practice/data/mixed.js',
  'practice/data/registry.js'
];

test('mixed topic reuses unit phrases and writes new fill sentences', () => {
  const { window } = loadScripts(PACKS);
  const R = window.PracticeRegistry;
  const ids = R.listUnits().map(u => u.id);
  assert.equal(ids.join(','), 'unit1,unit2,unit3,unit4,unit5,unit6');
  const choices = R.practiceChoices();
  assert.equal(choices[choices.length - 1].label, 'Mixed topic');

  const mixed = R.getUnit('mixed');
  assert.equal(mixed.id, 'mixed');
  assert.equal(mixed.title, 'Mixed topic');
  assert.equal(mixed.fillIn.length, 9);
  assert.equal(mixed.fillInHard.length, 9);
  assert.equal(mixed.missingLetters.length, 9);
  assert.equal(mixed.matching.length, 9);
  assert.equal(mixed.words.length, 9);

  const keys = mixed.words.map(w => w.key);
  keys.forEach(key => assert.equal(/^mixed:/.test(key), false, key));
  const unitPacks = ['PRACTICE_UNIT1', 'PRACTICE_UNIT2', 'PRACTICE_UNIT3', 'PRACTICE_UNIT4'];
  const knownWords = new Map();
  const knownSentences = new Set();
  unitPacks.forEach(name => {
    const pack = window[name];
    (pack.words || []).forEach(word => knownWords.set(word.key, word));
    ['fillIn', 'fillInHard'].forEach(field => {
      (pack[field] || []).forEach(item => knownSentences.add(item.sentence));
    });
  });
  mixed.words.forEach(word => {
    const source = knownWords.get(word.key);
    assert.ok(source, word.key);
    assert.equal(word.en, source.en);
    assert.equal(word.zh, source.zh);
    assert.equal(word.form, source.form);
  });
  mixed.fillIn.concat(mixed.fillInHard).forEach(item => {
    assert.equal(knownSentences.has(item.sentence), false, item.sentence);
    assert.equal(knownWords.get(item.wordKey).en, item.answer);
  });

  const easyAnswers = mixed.fillIn.map(item => item.answer);
  const hardAnswers = mixed.fillInHard.map(item => item.answer);
  assert.equal(new Set(easyAnswers).size, 9);
  assert.equal(new Set(hardAnswers).size, 9);
  easyAnswers.forEach(answer => {
    assert.equal(mixed.words.some(word => word.en === answer), true, answer);
    assert.equal(mixed.fillInHard.some(item => item.answer === answer), true, answer);
  });
  mixed.missingLetters.forEach(item => {
    const source = knownWords.get(item.wordKey);
    assert.equal(item.word, source.en);
    if (source.en.includes(' ')) assert.match(item.word, / /);
  });
  mixed.matching.forEach(item => {
    assert.ok(item.form);
    assert.ok(item.zh);
    assert.ok(item.img);
  });

  const root = path.join(__dirname, '..');
  ['practice/index.html', 'practice/fill.html', 'practice/letters.html', 'practice/match.html', 'practice/timed.html'].forEach(rel => {
    const html = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.match(html, /data\/mixed\.js/);
  });
  assert.equal(fs.readFileSync(path.join(root, 'practice/data/registry.js'), 'utf8').includes('buildMixed'), false);
});

test('mixed practice stays open and does not unlock unit badges', () => {
  const { window } = loadScripts(['practice/badges.js']);
  assert.equal(window.Badges.unitUnlocked('mixed'), true);
  assert.equal(window.Badges.lockReason('mixed'), '');
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
  window.Badges.recordSession('mixed', 'match', null, { correct: 5, total: 5 });
  window.Badges.recordSession('mixed', 'letters', 'easy', { correct: 10, total: 10 });
  window.Badges.recordSession('mixed', 'timed', null, { correct: 4, total: 4 });
  assert.equal(window.Badges.isEarned('all-rounder'), false);
  window.Badges.recordSession('mixed', 'fill', 'hard', { correct: 8, total: 10 });
  assert.equal(window.Badges.isEarned('all-rounder'), true);
  assert.equal(window.Badges.isEarned('match-pro'), false);
  assert.equal(window.Badges.isEarned('unit-done:mixed'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
  const badge = window.Badges.catalog().find(b => b.id === 'all-rounder');
  assert.equal(badge.english, 'All-rounder');
  assert.equal(badge.title, '全能練習生');
  assert.match(badge.detail, /Mixed topic/);
  assert.match(badge.detail, /Sentence Fill/);
  assert.match(badge.detail, /Missing Letters/);
  assert.match(badge.detail, /Memory Match/);
  assert.match(badge.detail, /Timed Challenge/);
});

test('unit practice does not earn All-rounder', () => {
  const { window } = loadScripts(['practice/badges.js']);
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(id => {
    window.Badges.recordSession(id, 'fill', 'easy');
    window.Badges.recordSession(id, 'letters', 'easy');
    window.Badges.recordSession(id, 'match');
    window.Badges.recordSession(id, 'timed');
  });
  assert.equal(window.Badges.isEarned('all-rounder'), false);
  assert.equal(window.Badges.isEarned('match-pro'), true);
});
