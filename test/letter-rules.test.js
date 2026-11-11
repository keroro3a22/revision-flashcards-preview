const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../assets/letter-rules.js');
const { loadScripts } = require('./helpers');

const IGNORE = ['the', 'and', 'but', 'nor'];

function cap(word, mode) {
  if (word.length <= 2 || IGNORE.includes(word.toLowerCase())) return 0;
  return Math.floor((mode === 'hard' ? 51 : 35) * word.length / 100);
}

function checkPhrase(phrase, pattern, mode) {
  assert.equal(pattern.length, phrase.length, phrase);
  let start = null;
  for (let i = 0; i <= phrase.length; i++) {
    const letter = i < phrase.length && /[A-Za-z]/.test(phrase[i]);
    if (letter && start == null) start = i;
    if (!letter && start != null) {
      const word = phrase.slice(start, i);
      const masked = pattern.slice(start, i);
      let blanks = 0;
      let run = 0;
      let maxRun = 0;
      for (let n = 0; n < word.length; n++) {
        if (masked[n] === '_') {
          blanks += 1;
          run += 1;
          if (run > maxRun) maxRun = run;
          if (mode !== 'hard') assert.notEqual(n, 0, word + ' hid its first letter');
        } else {
          run = 0;
          assert.equal(masked[n], word[n]);
        }
      }
      assert.equal(blanks, cap(word, mode), word + ' ' + mode + ' ' + masked);
      assert.ok(maxRun < (mode === 'hard' ? 3 : 2), word + ' ' + mode + ' ' + masked);
      start = null;
    }
    if (i < phrase.length && !letter) assert.equal(pattern[i], phrase[i]);
  }
}

test('easy and hard stop at the percentage and follow the letter limits', () => {
  assert.equal(rules.maskPhrase('mix', 'easy', () => 0), 'm_x');
  assert.equal(rules.maskPhrase('mix', 'hard', () => 0), '_ix');
  assert.equal(rules.maskPhrase('spread', 'easy', () => 0), 's_r_ad');
  assert.equal(rules.maskPhrase('spread', 'hard', () => 0), '__r_ad');
  assert.equal(rules.maskPhrase('adopt a pet', 'easy', () => 0), 'a_opt a p_t');
  assert.equal(rules.maskPhrase('adopt a pet', 'hard', () => 0), '__opt a _et');
  assert.equal(rules.maskPhrase('bad for', 'easy', () => 0), 'b_d f_r');
  assert.equal(rules.maskPhrase('bad for', 'hard', () => 0), '_ad _or');
  assert.equal(rules.maskPhrase('bad for', 'hard', () => 0, ['for']), '_ad for');
  assert.equal(rules.maskPhrase('go on', 'easy', () => 0), 'go on');
  assert.equal(rules.maskPhrase('go on', 'hard', () => 0.9), 'go on');
  assert.equal(rules.maskPhrase('fund-raising', 'easy', () => 0), 'f_nd-r_i_ing');
  assert.equal(rules.maskPhrase('the flood', 'easy', () => 0), 'the f_ood');
  assert.equal(rules.maskPhrase('go snowboarding', 'easy', () => 0), 'go s_o_b_a_ding');
  assert.equal(rules.maskPhrase('go snowboarding', 'hard', () => 0), 'go __o__o__ding');
  assert.equal(rules.removals('spread', 'easy').length, 6);
  assert.equal(rules.removals('spread', 'hard').length, 16);
  assert.equal(rules.removals('snowboarding', 'easy').length, 70);
  assert.equal(rules.removals('snowboarding', 'hard').length, 357);
});

test('random picks another legal mask when more than one exists', () => {
  const first = rules.hiddenIndexes('mix', 'hard', () => 0);
  const original = Math.random;
  let step = 0;
  Math.random = () => {
    step += 1;
    return (step % 3) / 3;
  };
  try {
    const next = rules.anotherHide('mix', 'hard', first);
    assert.notDeepEqual(Object.keys(next).map(Number).sort(), Object.keys(first).map(Number).sort());
    checkPhrase('mix', 'mix'.split('').map((ch, i) => (next[i] ? '_' : ch)).join(''), 'hard');
  } finally {
    Math.random = original;
  }
  assert.deepEqual(rules.anotherHide('go', 'easy', {}), {});
});

test('ignore words are longer than two letters', () => {
  assert.deepEqual(rules.parseIgnore('A, an the, and, or, as'), ['the', 'and']);
  assert.equal(rules.ignoreText(), 'the, and, but, nor');
  rules.ignoreWords().forEach(word => assert.ok(word.length > 2, word));
  rules.setIgnoreWords('a, are, the');
  try {
    assert.equal(rules.maskPhrase('are they', 'easy', () => 0), 'are t_ey');
    assert.deepEqual(rules.ignoreWords(), ['are', 'the']);
  } finally {
    rules.setIgnoreWords(IGNORE);
  }
});

test('every published missing-letter phrase stays inside the rules', () => {
  const { window } = loadScripts([
    'practice/data/unit1.js',
    'practice/data/unit2.js',
    'practice/data/unit3.js',
    'practice/data/unit4.js',
    'practice/data/unit5.js',
    'practice/data/unit6.js',
    'practice/data/mixed.js'
  ]);
  const packs = [
    window.PRACTICE_UNIT1,
    window.PRACTICE_UNIT2,
    window.PRACTICE_UNIT3,
    window.PRACTICE_UNIT4,
    window.PRACTICE_UNIT5,
    window.PRACTICE_UNIT6,
    window.PRACTICE_MIXED
  ];
  const samples = [0, 0.2, 0.55, 0.8, 0.999];
  packs.forEach(pack => {
    pack.missingLetters.forEach(item => {
      ['easy', 'hard'].forEach(mode => {
        samples.forEach(n => {
          checkPhrase(item.word, rules.maskPhrase(item.word, mode, () => n), mode);
        });
      });
    });
  });
});
