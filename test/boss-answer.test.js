const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const boss = require('../practice/grammar/boss-answer.js');

const root = path.join(__dirname, '..');

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, 'missing ' + signature);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + signature);
}

test('a single-blank string answer such as who is correct and fills one blank', () => {
  assert.equal(boss.matches('who', 'who'), true);
  assert.equal(boss.answerKey('who'), 'who');
  assert.deepEqual(boss.blankValues('who'), ['who']);
});

test('a baked two-blank string still grades and fills both blanks', () => {
  assert.equal(boss.matches('as · as', 'as · as'), true);
  assert.deepEqual(boss.blankValues('as · as'), ['as', 'as']);
  assert.equal(boss.matches('will · so that', 'will · so that'), true);
  assert.deepEqual(boss.blankValues('will · so that'), ['will', 'so that']);
});

test('two separate blanks stored as an array grade as the joined option', () => {
  assert.equal(boss.matches('as · as', ['as', 'as']), true);
  assert.equal(boss.answerKey(['as', 'as']), 'as · as');
  assert.deepEqual(boss.blankValues(['as', 'as']), ['as', 'as']);
});

test('a one-element array that is already joined still grades and fills both blanks', () => {
  assert.equal(boss.matches('as · as', ['as · as']), true);
  assert.equal(boss.answerKey(['as · as']), 'as · as');
  assert.deepEqual(boss.blankValues(['as · as']), ['as', 'as']);
});

test('will and so that stored as an array grade as one option and two blanks', () => {
  assert.equal(boss.matches('will · so that', ['will', 'so that']), true);
  assert.equal(boss.answerKey(['will', 'so that']), 'will · so that');
  assert.deepEqual(boss.blankValues(['will', 'so that']), ['will', 'so that']);
});

test('a wrong option is still marked wrong', () => {
  assert.equal(boss.matches('which', 'who'), false);
  assert.equal(boss.matches('as · than', ['as', 'as']), false);
  assert.equal(boss.matches('as · than', ['as · as']), false);
  assert.equal(boss.matches('would · although', ['will', 'so that']), false);
});

test('the boss page grades and fills blanks with that helper', () => {
  const html = fs.readFileSync(path.join(root, 'practice/grammar/boss/index.html'), 'utf8');
  assert.match(html, /<script src="boss-answer\.js\?v=1"><\/script>/);
  const answer = extractFunction(html, 'function answer(');
  const prompt = extractFunction(html, 'function renderPrompt(');
  assert.match(answer, /BossAnswer\.matches\(opt,\s*it\.answer\)/);
  assert.match(prompt, /BossAnswer\.blankValues\(/);
  assert.doesNotMatch(answer, /opt === it\.answer/);
  assert.doesNotMatch(prompt, /val != null \? \[val\] : null/);
});
