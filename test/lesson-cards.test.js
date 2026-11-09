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
  assert.match(studio, /SUPABASE_PUBLIC/);
  assert.match(studio, /is_content_editor/);
  assert.match(fs.readFileSync('assets/account.js', 'utf8'), /id = 'edit-lessons'/);
  assert.match(fs.readFileSync('assets/account.js', 'utf8'), /insertBefore\(link, slot\.firstChild\)/);
  assert.match(fs.readFileSync('supabase/migrations/20261109140000_cynthia_editor.sql', 'utf8'), /cynthiasumyi/);
});
