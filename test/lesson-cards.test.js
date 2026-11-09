const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const sql = fs.readFileSync('supabase/migrations/20261109120000_lesson_cards.sql', 'utf8');
const studio = fs.readFileSync('assets/studio.js', 'utf8');
const live = fs.readFileSync('assets/lesson-live.js', 'utf8');

test('lesson cards are one row per book, series, term, level, unit, and number', () => {
  assert.match(sql, /unique \(book, series, term, level, unit_id, n\)/);
  assert.match(sql, /series in \('mypearson-express', 'elect'\)/);
  assert.match(sql, /term in \('first', 'second'\)/);
  assert.match(sql, /lesson_cards_live/);
  assert.match(sql, /status = 'published'/);
  assert.match(sql, /revoke all on public\.lesson_cards from anon/);
  assert.equal((sql.match(/\('oxford', 'oxford', 'first', 'p6', 'unit1',/g) || []).length, 10);
});

test('the public page asks for the published series and term', () => {
  ['unit1', 'unit2', 'unit3', 'unit4', 'dictation3'].forEach((unit) => {
    const html = fs.readFileSync(unit + '/index.html', 'utf8');
    assert.match(html, new RegExp('data-book="oxford" data-series="oxford" data-level="p6" data-term="first" data-unit="' + unit + '"'));
    assert.match(html, /let CARDS/);
    assert.match(html, /function renderLesson/);
    assert.match(html, /window\.applyLessonCards/);
    assert.match(html, /lesson-live\.js\?v=1/);
  });
  assert.match(live, /SUPABASE_PUBLIC/);
  assert.match(live, /\.eq\('series', series\)/);
  assert.match(live, /\.eq\('term', term\)/);
});

test('the studio edits the same place and publishes a snapshot', () => {
  assert.match(studio, /mypearson-express/);
  assert.match(studio, /elect/);
  assert.match(studio, /上學期/);
  assert.match(studio, /下學期/);
  assert.match(studio, /status: status/);
  assert.match(studio, /patch\.published = data/);
  assert.doesNotMatch(studio, /data\.highlight = data\.en/);
  assert.match(studio, /contentEditable = 'true'/);
  assert.match(studio, /\['ex_en', 'ex_zh'\]/);
  assert.match(studio, /\['adv_en', 'adv_zh'\]/);
  assert.match(studio, /Change photo/);
  assert.match(studio, /lesson-media/);
  assert.match(studio, /SUPABASE_PUBLIC/);
  assert.match(studio, /is_content_editor/);
  assert.match(studio, /Back to website|revision-studio-from/);
  const page = fs.readFileSync('studio.html', 'utf8');
  assert.match(page, />Back to website</);
  assert.doesNotMatch(page, /<th>Highlight<\/th>/);
  assert.match(studio, /Highlight this/);
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  assert.match(css, /\.studio-pair:focus-within \.studio-mark \{ display: block; \}/);
  assert.match(css, /\.studio-scroll \{ overflow-x: auto/);
  assert.match(css, /min-width: 80\.3rem/);
  assert.match(studio, /data\.highlight = row && row\.highlight/);
  assert.match(page, /Example<br>例句/);
  assert.match(page, /Advanced<br>進階例句/);
  assert.doesNotMatch(page, />Video</);
  assert.doesNotMatch(page, />Audio</);
  assert.doesNotMatch(studio, /pathCell\('audio'/);
  assert.match(studio, /data\.audio = row && row\.audio/);
  const head = page.slice(page.indexOf('<thead>'), page.indexOf('</thead>'));
  assert.ok(head.indexOf('>#<') < head.indexOf('>Photo<'));
  const render = studio.slice(studio.indexOf('function render'), studio.indexOf('function readRow'));
  assert.ok(render.indexOf("number.className = 'is-num'") < render.indexOf('photoCell(row)'));
  assert.doesNotMatch(studio, /pathCell\('video'/);
  assert.match(fs.readFileSync('assets/account.js', 'utf8'), /id = 'edit-lessons'/);
  assert.match(fs.readFileSync('assets/account.js', 'utf8'), /revision-studio-from/);
  assert.match(fs.readFileSync('supabase/migrations/20261109140000_cynthia_editor.sql', 'utf8'), /cynthiasumyi/);
});

test('a chosen phrase is marked in the example and left alone when the words differ', () => {
  const start = studio.indexOf('function escapeHtml');
  const end = studio.indexOf('function paintField');
  const highlightHtml = new Function(studio.slice(start, end) + '\nreturn highlightHtml;')();
  assert.equal(
    highlightHtml('The girl does voluntary work at the elderly home.', 'does voluntary work'),
    'The girl <span class="studio-hl">does voluntary work</span> at the elderly home.'
  );
  assert.equal(highlightHtml('the disaster injured people nearby.', 'injure people'), 'the disaster injured people nearby.');
  assert.equal(highlightHtml('<b>', ''), '&lt;b&gt;');
});
