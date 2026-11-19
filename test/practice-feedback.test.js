const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('a wrong sentence fill keeps the typed answer and the word bank can swap before Check', () => {
  const fill = read('practice/fill/index.html');
  const wrong = fill.slice(fill.indexOf('} else {'), fill.indexOf('btnNext.hidden = false'));
  assert.match(fill, /title\.textContent = 'Correct: ' \+ item\.answer/);
  assert.match(wrong, /classList\.add\('filled', 'is-wrong'\)/);
  assert.doesNotMatch(fill, /slotRef\.input\.value = item\.answer/);
  assert.doesNotMatch(fill, /textContent = item\.answer/);
  assert.match(fill, /btnClear\.disabled = true/);
  const click = fill.slice(fill.indexOf("chip.addEventListener('click'"), fill.indexOf('bankEl.appendChild(chip)'));
  assert.match(click, /if \(locked\) return;/);
  assert.match(click, /if \(chip\.classList\.contains\('used'\)\) return;/);
  assert.match(click, /place\(opt, chip\);/);
  assert.doesNotMatch(click, /if \(!placed\)/);
  assert.match(fill, /practice\.css\?v=17/);
});

test('missing letters keep a wrong attempt and ask for every letter before scoring', () => {
  const html = read('practice/letters/index.html');
  const css = read('practice/practice.css');
  assert.equal(html.split('Fill in every letter first.').length - 1, 1);
  const handler = html.slice(html.indexOf("btnCheck.addEventListener('click'"), html.indexOf("btnNext.addEventListener"));
  const ask = handler.indexOf('showLetterNeed()');
  const lock = handler.indexOf('locked = true');
  assert.ok(ask > -1 && ask < lock);
  assert.doesNotMatch(handler.slice(0, lock), /btnCheck\.(?:disabled|hidden) = true/);
  assert.match(html, /btnCheck\.disabled = false/);
  assert.match(html, /setTimeout\(function \(\) \{\s*letterNeed\.hidden = true;[\s\S]*?\}, 2000\)/);
  const wrong = handler.slice(handler.indexOf('} else {'));
  assert.match(wrong, /It\\'s “' \+ item\.word \+ '”'/);
  assert.match(wrong, /classList\.add\('is-wrong'\)/);
  assert.doesNotMatch(wrong, /inp\.value\s*=/);
  assert.doesNotMatch(wrong, /is-correct/);
  const hint = css.slice(css.indexOf('.letter-need {'), css.indexOf('.letter-need {') + 280);
  assert.match(hint, /text-align:\s*center/);
  assert.match(hint, /color:\s*#c43c3c/);
  assert.match(hint, /font-size:\s*0\.8rem/);
  assert.match(hint, /font-weight:\s*500/);
  assert.match(hint, /background:\s*none/);
  assert.match(hint, /border:\s*0/);
  assert.doesNotMatch(hint, /border-radius:\s*var\(--pill\)|var\(--pink\)|font-weight:\s*700/);
  const mark = css.slice(css.indexOf('.letter-slot.is-wrong input'), css.indexOf('.letter-slot.is-space'));
  assert.match(mark, /color:\s*#c43c3c/);
  assert.match(html, /practice\.css\?v=17/);
});

test('story, chat, and join keep the chosen word after a wrong Check', () => {
  for (let n = 1; n <= 6; n += 1) {
    const story = read('practice/grammar/unit' + n + '-story/index.html');
    const chat = read('practice/grammar/unit' + n + '-chat/index.html');
    const join = read('practice/grammar/unit' + n + '-join/index.html');
    assert.match(story, /renderPrompt\(vals\)/);
    assert.match(story, /renderPrompt\(s\.answer, "ok"\)/);
    assert.doesNotMatch(story, /renderPrompt\(s\.answer, "soft"\)/);
    assert.match(story, /classList\.add\("correct"\)/);
    assert.match(story, /classList\.add\("wrong"\)/);
    assert.match(story, /btnClear\.disabled = true/);
    assert.match(chat, /filled\[idx\] = selected/);
    assert.match(chat, /filledRight\[idx\] = false/);
    assert.match(chat, /renderThread\(selected\)/);
    assert.match(chat, /renderThread\(answer, "ok"\)/);
    assert.match(chat, /showToast\(toast, "Answer: " \+ answer/);
    assert.doesNotMatch(chat, /renderThread\(answer, "soft"\)/);
    assert.match(chat, /classList\.add\("correct"\)/);
    assert.match(chat, /classList\.add\("wrong"\)/);
    assert.match(join, /showFullJoin\(selected\)/);
    assert.match(join, /showFullJoin\(item\.answer, "ok"\)/);
    assert.match(join, /item\.full/);
    assert.doesNotMatch(join, /showFullJoin\(item\.answer, "soft"\)/);
    assert.match(join, /classList\.add\("correct"\)/);
    assert.match(join, /classList\.add\("wrong"\)/);
  }
  const boss = read('practice/grammar/boss/index.html');
  const timed = read('practice/timed/index.html');
  const match = read('practice/match/index.html');
  [boss, timed, match].forEach((html) => {
    assert.equal(html.includes('Fill in every letter first.'), false);
    assert.equal(html.includes('letter-need'), false);
  });
  assert.match(boss, /renderPrompt\(it\.answer, "ok"\)/);
});
