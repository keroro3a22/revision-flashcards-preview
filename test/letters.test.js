const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts, loadPacks } = require('./helpers');

test('easy and hard masks keep spaces and punctuation', () => {
  const { window } = loadScripts(['assets/letter-rules.js', 'practice/common.js']);
  const phrase = 'buy/sell raffle tickets';
  const easy = window.PracticeCommon.maskPhrase(phrase, 'easy');
  const hard = window.PracticeCommon.maskPhrase(phrase, 'hard', arr => arr.slice());
  [easy, hard].forEach(mask => {
    assert.equal(mask.length, phrase.length);
    for (let i = 0; i < phrase.length; i++) {
      const ch = phrase[i];
      if (!/[a-zA-Z]/.test(ch)) assert.equal(mask[i], ch);
      else assert.ok(mask[i] === ch || mask[i] === '_');
    }
    assert.ok(mask.includes('_'));
    assert.ok(mask.includes('/'));
    assert.ok(mask.includes(' '));
  });
  const slots = window.PracticeCommon.patternToSlots(phrase, easy);
  const shown = slots.filter(s => s.type === 'show').map(s => s.char).join('');
  assert.ok(shown.includes('/'));
  assert.ok(shown.includes(' '));
});

test('articles and little conjunctions stay filled in on every pack', () => {
  const { window } = loadScripts([
    'practice/data/unit1.js',
    'practice/data/unit2.js',
    'practice/data/unit3.js',
    'practice/data/unit4.js',
    'practice/data/unit5.js',
    'practice/data/unit6.js',
    'practice/data/mixed.js',
    'assets/letter-rules.js',
    'practice/common.js'
  ]);
  const shownWords = { a: 1, an: 1, the: 1, and: 1, or: 1, but: 1, nor: 1, as: 1 };
  const packs = [
    window.PRACTICE_UNIT1,
    window.PRACTICE_UNIT2,
    window.PRACTICE_UNIT3,
    window.PRACTICE_UNIT4,
    window.PRACTICE_MIXED
  ];
  function tokens(mask, phrase) {
    const parts = [];
    let buf = '';
    let original = '';
    for (let i = 0; i < phrase.length; i++) {
      if (!/[a-zA-Z]/.test(phrase[i])) {
        if (buf) parts.push({ mask: buf, word: original });
        buf = '';
        original = '';
      } else {
        buf += mask[i];
        original += phrase[i];
      }
    }
    if (buf) parts.push({ mask: buf, word: original });
    return parts;
  }
  packs.forEach(pack => {
    pack.missingLetters.forEach(item => {
      ['easy', 'hard'].forEach(mode => {
        const mask = window.PracticeCommon.maskPhrase(item.word, mode, () => 0);
        tokens(mask, item.word).forEach(part => {
          if (shownWords[part.word.toLowerCase()]) {
            assert.equal(part.mask.includes('_'), false, item.word + ' ' + mode + ' ' + part.word);
          }
        });
      });
    });
  });
  const bee = window.PracticeCommon.maskPhrase('as busy as a bee', 'hard', arr => arr.slice());
  assert.equal(bee.startsWith('as '), true);
  assert.ok(bee.includes(' as '));
  assert.equal(window.PracticeCommon.maskPhrase('a drought', 'hard', arr => arr.slice()).startsWith('a '), true);
  assert.equal(window.PracticeCommon.maskPhrase('an action film', 'easy').startsWith('an '), true);
});

test('missing letters use each unit phrase, not a single keyword', () => {
  const { window } = loadPacks();
  const packs = [
    window.PRACTICE_UNIT1,
    window.PRACTICE_UNIT2,
    window.PRACTICE_UNIT3,
    window.PRACTICE_UNIT4
  ];
  packs.forEach(pack => {
    assert.equal(pack.missingLetters.length, pack.words.length);
    pack.missingLetters.forEach(item => {
      const word = pack.words.find(w => w.key === item.wordKey);
      assert.ok(word, item.wordKey);
      assert.equal(item.word, word.en);
      assert.ok(item.audio);
    });
  });
  const raffle = window.PRACTICE_UNIT1.missingLetters.find(i => i.wordKey === 'unit1:raffle');
  assert.equal(raffle.word, 'buy/sell raffle tickets');
  const adopt = window.PRACTICE_UNIT1.missingLetters.find(i => i.wordKey === 'unit1:adopt');
  assert.equal(adopt.word, 'adopt a pet');
  const walk = window.PRACTICE_UNIT1.missingLetters.find(i => i.wordKey === 'unit1:walkathon');
  assert.equal(walk.word, 'go on a walkathon');
});

function slotText(slot) {
  return slot.type === 'show' ? slot.char : slot.answer;
}

function flattenGroups(groups) {
  return groups.map(g => g.slots.map(slotText).join('') + (g.trail === 'space' ? ' ' : '')).join('');
}

test('letter groups keep each English word intact and wrap at spaces, slashes, and punctuation', () => {
  const { window } = loadScripts([
    'practice/data/unit1.js',
    'practice/data/unit2.js',
    'practice/data/unit3.js',
    'practice/data/unit4.js',
    'practice/data/unit5.js',
    'practice/data/unit6.js',
    'assets/letter-rules.js',
    'practice/common.js'
  ]);
  const C = window.PracticeCommon;
  const packs = [
    window.PRACTICE_UNIT1,
    window.PRACTICE_UNIT2,
    window.PRACTICE_UNIT3,
    window.PRACTICE_UNIT4
  ];
  const raffleSlots = C.patternToSlots('buy/sell raffle tickets', 'buy/sell raffle tickets');
  const raffleGroups = C.groupLetterSlots(raffleSlots);
  assert.deepEqual([...raffleGroups].map(g => g.slots.map(slotText).join('') + (g.trail === 'space' ? ' ' : '')), [
    'buy/',
    'sell ',
    'raffle ',
    'tickets'
  ]);
  const fair = C.groupLetterSlots(C.patternToSlots(
    'take part in a fund-raising fair',
    'take part in a fund-raising fair'
  ));
  assert.deepEqual([...fair].map(g => g.slots.map(slotText).join('')), [
    'take', 'part', 'in', 'a', 'fund-', 'raising', 'fair'
  ]);

  packs.forEach(pack => {
    pack.missingLetters.forEach(item => {
      ['easy', 'hard'].forEach(mode => {
        const mask = C.maskPhrase(item.word, mode, arr => arr.slice());
        const groups = C.groupLetterSlots(C.patternToSlots(item.word, mask));
        assert.equal(flattenGroups(groups), item.word, item.wordKey + ' ' + mode);
        const wordTexts = [...groups]
          .filter(g => g.kind === 'word')
          .map(g => g.slots.map(slotText).join(''));
        const groupRuns = wordTexts.map(text => {
          assert.equal(text.includes(' '), false, text);
          const parts = text.match(/[A-Za-z]+/g) || [];
          assert.ok(parts.length <= 1, text);
          return parts[0] || '';
        }).filter(Boolean);
        assert.deepEqual(groupRuns, [...(item.word.match(/[A-Za-z]+/g) || [])], item.word);
      });
    });
  });
});

test('missing letters render wraps between words, not inside them', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'practice/letters/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'practice/practice.css'), 'utf8');
  assert.match(html, /groupLetterSlots/);
  assert.match(html, /letter-word/);
  assert.match(html, /group\.trail === 'space'/);
  assert.match(html, /letter-slot is-space/);
  assert.doesNotMatch(html, /lettersEl\.appendChild\(wrap\)/);
  const wordRule = css.slice(css.indexOf('.letter-word {'), css.indexOf('.letter-word.is-spaced'));
  assert.match(wordRule, /flex-wrap:\s*nowrap/);
  assert.match(wordRule, /white-space:\s*nowrap/);
  assert.match(wordRule, /gap:\s*0\.08rem/);
  const spaceRule = css.slice(css.indexOf('.letter-slot.is-space {'), css.indexOf('.letter-slot.is-space {') + 360);
  assert.match(spaceRule, /width:\s*1\.5rem/);
  assert.match(spaceRule, /background:\s*transparent/);
  assert.match(spaceRule, /border-bottom:\s*0/);
  const blankRule = css.slice(css.indexOf('.letter-slot:not(.show) {'), css.indexOf('.letter-slot:not(.show):focus-within'));
  assert.match(blankRule, /border-radius:\s*var\(--pill\)/);
  assert.match(blankRule, /color-mix\(in srgb, var\(--navy\) 22%, transparent\)/);
  assert.doesNotMatch(blankRule, /border-bottom:\s*3px/);
  assert.doesNotMatch(blankRule, /var\(--sunny\)/);
  const inputRule = css.slice(css.indexOf('.letter-slot input {'), css.indexOf('.letter-slot input:focus'));
  assert.match(inputRule, /background:\s*transparent/);
  assert.match(inputRule, /color:\s*var\(--navy\)/);
  assert.doesNotMatch(inputRule, /var\(--sunny\)/);
  assert.match(html, /practice\.css\?v=11/);
  assert.match(html, /letter-rules\.js/);
  const rowRule = css.slice(css.indexOf('.letter-row {'), css.indexOf('.letter-word {'));
  assert.doesNotMatch(rowRule, /display:\s*flex/);
  assert.match(css, /overflow-wrap:\s*normal/);
  const unitCss = fs.readFileSync(path.join(root, 'assets/unit.css'), 'utf8');
  const syllables = unitCss.slice(unitCss.indexOf('.syllables {'), unitCss.indexOf('.zh {'));
  assert.doesNotMatch(syllables, /overflow-wrap:\s*anywhere/);
  assert.match(syllables, /overflow-wrap:\s*normal/);
});
