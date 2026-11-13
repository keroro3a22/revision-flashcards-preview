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

test('the pages table resizes like the other tables and picks a unit photo', () => {
  const pages = fs.readFileSync('assets/studio-pages.js', 'utf8');
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  assert.match(pages, /Copy path/);
  assert.match(pages, /mountStudioColumns/);
  assert.match(pages, /RevisionStudioLibrary\.open/);
  assert.doesNotMatch(pages, /Choose a photo from this unit/);
  assert.match(pages, /openPhotoFrame/);
  assert.match(pages, /ratio: ratio/);
  assert.doesNotMatch(pages, /shape: ratio === 1/);
  assert.doesNotMatch(pages, /type = 'file'/);
  assert.match(css, /data-shape="pages"/);
  assert.match(css, /col-page-line/);
});

test('lesson search looks through every table and quotes the words', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const html = fs.readFileSync('studio/index.html', 'utf8');
  assert.match(html, /id="studio-search"/);
  assert.match(html, /id="studio-library-open"/);
  assert.doesNotMatch(html, /value="library"/);
  assert.match(js, /searchSuggestions/);
  assert.match(js, /studio-suggest-path/);
  assert.match(js, /lesson_cards/);
  assert.match(js, /practice_items/);
  assert.match(js, /site_pages/);
  const library = js.slice(js.indexOf('function searchLibrary'), js.indexOf('function mountSearch'));
  assert.doesNotMatch(library, /\.eq\('book'/);
  assert.doesNotMatch(library, /'options'/);
});

test('the library button opens website folders and stored files', () => {
  const html = fs.readFileSync('studio/index.html', 'utf8');
  const browser = fs.readFileSync('assets/studio-library.js', 'utf8');
  const page = fs.readFileSync('assets/studio.js', 'utf8');
  const catalog = JSON.parse(fs.readFileSync('assets/site-files.json', 'utf8'));
  const unit1 = catalog.folders.find((folder) => folder.name === 'unit1');
  assert.equal(html.includes('value="library"'), false);
  assert.match(html, /id="studio-library-open">Library/);
  assert.match(page, /studio-library-open/);
  assert.match(page, /RevisionStudioLibrary\.open/);
  assert.doesNotMatch(page, /section === 'library'/);
  assert.match(browser, /assets\/site-files\.json/);
  assert.match(browser, /lesson-media/);
  assert.match(browser, /lesson-inbox/);
  assert.match(browser, /className = 'studio-files'/);
  assert.match(browser, /Download/);
  assert.match(browser, /Use this photo/);
  assert.doesNotMatch(browser, /studio-library/);
  assert.match(page, /chooseLibraryPhoto/);
  assert.match(page, /place: libraryPlace\(\)/);
  assert.match(page, /filter-unit-label'\)\.hidden = section === 'resources'/);
  assert.doesNotMatch(page, /filter-unit-label'\)\.hidden = pages/);
  assert.match(browser, /Living Oxford English/);
  assert.match(browser, /Primary Longman Elect/);
  assert.match(browser, /Book A/);
  assert.match(browser, /textContent = 'Back'/);
  assert.doesNotMatch(page, /type = 'file'/);
  const pages = fs.readFileSync('assets/studio-pages.js', 'utf8');
  assert.match(pages, /unit: unitId === 'home' \? '' : unitId/);
  assert.match(browser, /hooks\.folder/);
  assert.match(browser, /dragover/);
  assert.match(browser, /dataTransfer/);
  assert.match(browser, /Uploading /);
  assert.match(browser, /beforeunload/);
  assert.match(browser, /Upload stopped because the page was left/);
  assert.match(browser, /textContent = 'Remove'/);
  assert.match(browser, /studio-preview/);
  assert.match(browser, /pdf\.worker\.min\.js/);
  assert.match(browser, /Making the PDF preview/);
  assert.match(fs.readFileSync('assets/vendor/pdf.min.js', 'utf8'), /pdfjsLib/);
  assert.doesNotMatch(browser, /if \(!dialog\) return;/);
  assert.ok(unit1.files.some((file) => file.path === 'unit1/thumb_01.jpg'));
});

test('a path jump highlight fades back to the row color', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  assert.match(js, /function markPathRow/);
  assert.match(js, /classList\.remove\('is-path-row'\)/);
  assert.match(css, /transition: background-color 0\.7s ease/);
  assert.match(css, /tr\.is-path-row td \{ background: #e7f1fb; \}/);
});

test('every studio row copies one path for that row', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const start = js.indexOf('function actionCell');
  const cell = js.slice(start, js.indexOf('function render', start));
  assert.doesNotMatch(cell, /Copy easy|Copy hard/);
  assert.equal((cell.match(/Copy path/g) || []).length, 1);
  assert.match(cell, /liveTargets\(tr\)\.length/);
  assert.match(js, /button\.textContent = 'Retract'/);
  assert.match(js, /update\(\{ status: 'draft' \}\)/);
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
