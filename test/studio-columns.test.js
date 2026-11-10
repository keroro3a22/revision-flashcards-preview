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
    'col-num', 'col-photo', 'col-text', 'col-text', 'col-text', 'col-text', 'col-pair', 'col-pair', 'col-state', 'col-actions'
  ]);
});

test('grammar adds pattern and note without taking the example width', () => {
  const spec = columns.revisionColumns(Object.assign({}, place, { kind: 'grammar' }));
  assert.equal(spec.shape, 'grammar');
  assert.deepEqual(spec.columns.map((column) => column.col), [
    'col-num', 'col-photo', 'col-text', 'col-text', 'col-text', 'col-pattern', 'col-note', 'col-pair', 'col-pair', 'col-state', 'col-actions'
  ]);
});

test('missing letters and memory match omit unused explain and options', () => {
  const letters = columns.practiceColumns(Object.assign({}, place, { mode: 'letters' }));
  assert.deepEqual(letters.fields, ['prompt', 'answer']);
  assert.equal(letters.columns[1].label, 'Phrase');
  assert.equal(letters.columns.some((column) => column.label === 'Explain'), false);
  const match = columns.practiceColumns(Object.assign({}, place, { mode: 'match' }));
  assert.deepEqual(match.fields, ['prompt', 'answer']);
  assert.equal(match.columns[1].label, 'English');
  assert.equal(match.columns[2].label, '中文');
});

test('sentence fill keeps the choice list on easy and hides it on hard', () => {
  const easy = columns.practiceColumns(place);
  assert.deepEqual(easy.fields, ['prompt', 'answer', 'explain', 'options']);
  assert.equal(easy.shape, 'fill');
  const hard = columns.practiceColumns(Object.assign({}, place, { difficulty: 'hard' }));
  assert.deepEqual(hard.fields, ['prompt', 'answer', 'explain']);
  assert.equal(hard.shape, 'fill-hard');
});

test('grammar practice gives the passage the wide column', () => {
  const story = columns.practiceColumns(Object.assign({}, place, { kind: 'grammar', mode: 'story' }));
  assert.equal(story.shape, 'passage');
  assert.equal(story.columns[1].col, 'col-passage');
  assert.deepEqual(story.fields, ['prompt', 'answer', 'explain', 'options']);
});
