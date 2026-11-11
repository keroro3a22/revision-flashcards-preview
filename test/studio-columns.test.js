const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const studio = fs.readFileSync('assets/studio.js', 'utf8');
const start = studio.indexOf('function revisionColumns');
const end = studio.indexOf('function setColumns');
const columns = new Function(studio.slice(start, end) + '\nreturn { revisionColumns: revisionColumns, practiceColumns: practiceColumns };')();

const place = { kind: 'vocab', mode: 'fill', difficulty: 'easy' };

test('revision vocab keeps the photo and example columns', () => {
  const spec = columns.revisionColumns(place);
  assert.equal(spec.shape, 'revision');
  assert.deepEqual(spec.columns.map((column) => column.col), [
    'col-num', 'col-photo', 'col-audio', 'col-text', 'col-text', 'col-text', 'col-text', 'col-pair', 'col-pair', 'col-state', 'col-actions'
  ]);
});

test('grammar adds pattern and note without taking the example width', () => {
  const spec = columns.revisionColumns(Object.assign({}, place, { kind: 'grammar' }));
  assert.equal(spec.shape, 'grammar');
  assert.deepEqual(spec.columns.map((column) => column.col), [
    'col-num', 'col-photo', 'col-audio', 'col-text', 'col-text', 'col-text', 'col-pattern', 'col-note', 'col-pair', 'col-pair', 'col-state', 'col-actions'
  ]);
});

test('missing letters show the word and one easy and hard example', () => {
  const letters = columns.practiceColumns(Object.assign({}, place, { mode: 'letters' }));
  assert.equal(letters.kind, 'letters');
  assert.equal(letters.shape, 'letters');
  assert.deepEqual(letters.columns.map((column) => column.label), ['#', 'Word', 'Easy', 'Hard', 'State', '']);
  const match = columns.practiceColumns(Object.assign({}, place, { mode: 'match' }));
  assert.equal(match.kind, 'match');
  assert.equal(match.columns[1].label, 'English');
  assert.equal(match.columns[2].label, 'Picture');
});

test('every studio row copies one path for that row', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const start = js.indexOf('function actionCell');
  const cell = js.slice(start, js.indexOf('function render', start));
  assert.doesNotMatch(cell, /Copy easy|Copy hard/);
  assert.equal((cell.match(/Copy path/g) || []).length, 1);
});

test('sentence fill shows easy and hard together', () => {
  const easy = columns.practiceColumns(place);
  assert.equal(easy.kind, 'pair');
  assert.deepEqual(easy.columns.map((column) => column.label), ['#', 'Easy', 'Hard', 'Options', 'State', '']);
  const hard = columns.practiceColumns(Object.assign({}, place, { difficulty: 'hard' }));
  assert.equal(hard.kind, 'pair');
});

test('sentence fill draws a line between the question and the explanation', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  const cell = js.slice(js.indexOf('function fillSideCell'), js.indexOf('function hardCell'));
  assert.match(cell, /studio-fill-note/);
  assert.match(css, /\.studio-fill-note\s*\{[^}]*border-top:\s*1px solid #8ea4ba/);
});

test('grammar practice keeps a set list and a hard column', () => {
  const story = columns.practiceColumns(Object.assign({}, place, { kind: 'grammar', mode: 'story' }));
  assert.equal(story.shape, 'passage');
  assert.equal(story.columns[1].label, 'Photo');
  assert.equal(story.columns[2].col, 'col-passage');
  ['chat', 'boss'].forEach(function (mode) {
    const spec = columns.practiceColumns(Object.assign({}, place, { kind: 'grammar', mode: mode }));
    assert.equal(spec.columns[1].label, 'Photo', mode);
  });
  const join = columns.practiceColumns(Object.assign({}, place, { kind: 'grammar', mode: 'join' }));
  assert.equal(join.columns.some(function (column) { return column.label === 'Photo'; }), false);
  assert.equal(story.columns.some((column) => column.label === 'Hard'), true);
  assert.deepEqual(story.fields, ['prompt', 'answer', 'explain', 'options']);
});
