const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const LessonHighlight = require('../assets/lesson-highlight.js');
const draft = require('../assets/studio-draft.js');
const cases = require('./fixtures/highlight-dual-testcases.json');

function span(phrase) {
  return '<span class="hl">' + phrase + '</span>';
}

function stored(card) {
  return { highlight: card.highlight_sample, highlight_adv: card.highlight_advanced };
}

test('sample and advanced highlights are separate phrases', () => {
  const card = {
    highlight: 'turn the lights off',
    highlight_adv: 'turns the lights off'
  };
  assert.equal(LessonHighlight.phrase(card, 'ex_en'), 'turn the lights off');
  assert.equal(LessonHighlight.phrase(card, 'adv_en'), 'turns the lights off');
  assert.equal(
    LessonHighlight.mark('Please turn the lights off after class.', LessonHighlight.phrase(card, 'ex_en')),
    'Please <span class="hl">turn the lights off</span> after class.'
  );
  assert.equal(
    LessonHighlight.mark(
      'Now that the music lesson has ended, May turns the lights off before she goes home.',
      LessonHighlight.phrase(card, 'adv_en')
    ),
    'Now that the music lesson has ended, May <span class="hl">turns the lights off</span> before she goes home.'
  );
});

test('a blank advanced highlight still uses the legacy phrase, including case differences', () => {
  const card = { highlight: 'An Asian elephant' };
  const advanced = 'Although an Asian elephant is huge, it can move quietly through the forest to find leaves.';
  assert.equal(LessonHighlight.phrase(card, 'adv_en'), 'An Asian elephant');
  assert.equal(
    LessonHighlight.mark(advanced, LessonHighlight.phrase(card, 'adv_en')),
    'Although <span class="hl">an Asian elephant</span> is huge, it can move quietly through the forest to find leaves.'
  );
  assert.equal(LessonHighlight.phrase({ highlight: 'does voluntary work', highlight_adv: '   ' }, 'adv_en'), 'does voluntary work');
});

test('marking one example does not replace the other stored phrase', () => {
  const row = { highlight: 'unplug appliances', highlight_adv: 'unplugs appliances' };
  const sample = LessonHighlight.storedHighlights(row, 'ex_en', 'unplug appliances');
  assert.deepEqual(sample, { highlight: 'unplug appliances', highlight_adv: 'unplugs appliances' });
  const advanced = LessonHighlight.storedHighlights(row, 'adv_en', 'unplugs appliances');
  assert.equal(advanced.highlight, 'unplug appliances');
  assert.equal(advanced.highlight_adv, 'unplugs appliances');
  assert.equal(row.highlight, 'unplug appliances');
  assert.equal(row.highlight_adv, 'unplugs appliances');
});

test('Wu unit 1 vocab highlights the verb form in each sentence', () => {
  const expected = [
    { n: 5, sample: 'turn the lights off', advanced: 'turns the lights off' },
    { n: 14, sample: 'uses foam containers', advanced: 'use foam containers' },
    { n: 16, sample: 'unplug appliances', advanced: 'unplugs appliances' }
  ];
  expected.forEach((item) => {
    const card = cases.cards.find((row) => row.unit_id === 'unit1' && row.track === 'vocab' && row.n === item.n);
    assert.equal(card.highlight_sample, item.sample);
    assert.equal(card.highlight_advanced, item.advanced);
    const phrases = stored(card);
    assert.ok(LessonHighlight.mark(card.sample_en, LessonHighlight.phrase(phrases, 'ex_en')).includes(span(item.sample)));
    assert.ok(LessonHighlight.mark(card.advanced_en, LessonHighlight.phrase(phrases, 'adv_en')).includes(span(item.advanced)));
    assert.equal(LessonHighlight.mark(card.advanced_en, item.sample), card.advanced_en);
  });
});

test('every Oxford 6B fixture can highlight both sentences, and a single legacy phrase cannot cover a different form', () => {
  assert.equal(cases.cards.length, 105);
  cases.cards.forEach((card) => {
    const where = card.unit_id + ' ' + card.track + ' #' + card.n;
    const phrases = stored(card);
    const sampleHtml = LessonHighlight.mark(card.sample_en, LessonHighlight.phrase(phrases, 'ex_en'));
    const advancedHtml = LessonHighlight.mark(card.advanced_en, LessonHighlight.phrase(phrases, 'adv_en'));
    assert.ok(sampleHtml.includes(span(card.highlight_sample)), where + ' sample');
    assert.ok(advancedHtml.includes(span(card.highlight_advanced)), where + ' advanced');
    const legacy = { highlight: card.highlight_sample, highlight_adv: '' };
    const legacyAdvanced = LessonHighlight.mark(card.advanced_en, LessonHighlight.phrase(legacy, 'adv_en'));
    if (card.highlights_differ) {
      assert.equal(legacyAdvanced, card.advanced_en, where + ' legacy phrase misses the advanced form');
    } else {
      assert.ok(legacyAdvanced.includes(span(card.highlight_advanced)), where + ' legacy phrase still marks the advanced sentence');
    }
  });
});

test('grammar question words highlight Why and How often separately', () => {
  const card = cases.cards.find((item) => item.unit_id === 'unit3' && item.track === 'grammar' && item.en === 'question words');
  assert.equal(card.highlight_sample, 'Why');
  assert.equal(card.highlight_advanced, 'How often');
  const phrases = stored(card);
  assert.ok(LessonHighlight.mark(card.sample_en, LessonHighlight.phrase(phrases, 'ex_en')).includes(span('Why')));
  assert.equal(LessonHighlight.mark(card.advanced_en, 'Why'), card.advanced_en);
  assert.ok(LessonHighlight.mark(card.advanced_en, LessonHighlight.phrase(phrases, 'adv_en')).includes(span('How often')));
  assert.equal(LessonHighlight.mark(card.sample_en, 'How often'), card.sample_en);
});

test('a draft save keeps both highlights on the row while published is empty', () => {
  const data = {
    en: 'turn the lights off',
    highlight: 'turn the lights off',
    highlight_adv: 'turns the lights off',
    ex_en: 'Please turn the lights off after class.',
    adv_en: 'Now that the music lesson has ended, May turns the lights off before she goes home.'
  };
  const saved = draft.revisionPatch(data, 'draft');
  assert.equal(saved.status, 'draft');
  assert.equal(saved.highlight, 'turn the lights off');
  assert.equal(saved.highlight_adv, 'turns the lights off');
  assert.equal(Object.prototype.hasOwnProperty.call(saved, 'published'), false);
  const created = draft.revisionInsert({
    book: 'oxford', series: 'oxford', term: 'second', level: 'p6', unit: 'unit1', kind: 'vocab'
  }, 5);
  assert.equal(created.status, 'draft');
  assert.equal(created.published, null);
  assert.equal(created.highlight, '');
  assert.equal(created.highlight_adv, '');
  const live = draft.revisionPatch(data, 'published', { cutout: true, chips: [{ ok: true, text: 'of' }] });
  assert.equal(live.highlight, 'turn the lights off');
  assert.equal(live.highlight_adv, 'turns the lights off');
  assert.equal(live.published.highlight, 'turn the lights off');
  assert.equal(live.published.highlight_adv, 'turns the lights off');
  assert.equal(live.published.cutout, true);
  assert.equal(live.published.chips[0].text, 'of');
  assert.equal(Object.prototype.hasOwnProperty.call(live.published, 'status'), false);
});

test('studio applies Highlight this to the sentence that was selected', () => {
  const studio = fs.readFileSync(path.join('assets', 'studio.js'), 'utf8');
  const mark = studio.slice(studio.indexOf('function markSelection'), studio.indexOf('function edit'));
  const pair = studio.slice(studio.indexOf('function pairCell'), studio.indexOf('function photoSrc'));
  const read = studio.slice(studio.indexOf('function readRow'), studio.indexOf('function requestStore'));
  assert.match(mark, /storedHighlights\(row, editor\.dataset\.field, chosen\)/);
  assert.match(mark, /LessonHighlight\.phrase\(row, field\.dataset\.field\)/);
  assert.doesNotMatch(mark, /row\.highlight = chosen/);
  assert.match(pair, /LessonHighlight\.phrase\(row, topName\)/);
  assert.match(pair, /LessonHighlight\.phrase\(current, topName\)/);
  assert.doesNotMatch(pair, /paintField\(top, row\.highlight\)/);
  assert.match(read, /data\.highlight_adv = row && row\.highlight_adv/);
  assert.match(studio, /highlight,highlight_adv,/);
  const page = fs.readFileSync('studio.html', 'utf8');
  assert.match(page, /lesson-highlight\.js\?v=1/);
  assert.match(page, /studio-draft\.js\?v=10/);
  assert.match(page, /studio\.js\?v=26/);
  const start = studio.indexOf('function escapeHtml');
  const end = studio.indexOf('function paintField');
  const highlightHtml = new Function(studio.slice(start, end) + '\nreturn highlightHtml;')();
  assert.match(
    highlightHtml('The stall uses foam containers for takeaway noodles.', 'uses foam containers'),
    /<span class="studio-hl">uses foam containers<\/span>/
  );
  assert.equal(
    highlightHtml('Because foam is hard to recycle, we should not use foam containers for our takeaway lunch.', 'uses foam containers'),
    'Because foam is hard to recycle, we should not use foam containers for our takeaway lunch.'
  );
});

test('student cards and the live query use each sentence highlight', () => {
  const live = fs.readFileSync(path.join('assets', 'lesson-live.js'), 'utf8');
  assert.match(live, /highlight,highlight_adv,/);
  assert.match(live, /highlight,audio,img,video,pattern,note_zh,cutout/);
  ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'].forEach((unit) => {
    ['index.html', 'grammar.html'].forEach((file) => {
      const html = fs.readFileSync(path.join(unit, file), 'utf8');
      assert.match(html, /lesson-highlight\.js\?v=1/);
      assert.match(html, /LessonHighlight\.mark/);
      assert.match(html, /LessonHighlight\.phrase\(card, 'ex_en'\)/);
      assert.match(html, /LessonHighlight\.phrase\(card, 'adv_en'\)/);
      assert.match(html, /lesson-live\.js\?v=3/);
    });
  });
});

test('lesson_cards gains highlight_adv without dropping the published card view', () => {
  const sql = fs.readFileSync('supabase/migrations/20261111160000_lesson_card_highlight_adv.sql', 'utf8');
  assert.match(sql, /add column if not exists highlight_adv text not null default ''/);
  assert.match(sql, /published->>'highlight' as highlight/);
  assert.match(sql, /coalesce\(published->>'highlight_adv', ''\) as highlight_adv/);
  assert.match(sql, /coalesce\(published->>'pattern', ''\) as pattern/);
  assert.match(sql, /coalesce\(published->>'note_zh', ''\) as note_zh/);
  assert.match(sql, /coalesce\(published->>'cutout', ''\) = 'true' as cutout/);
  assert.match(sql, /status = 'published'/);
  assert.match(sql, /grant select on public\.lesson_cards_live to anon, authenticated/);
  assert.match(sql, /notify pgrst, 'reload schema'/);
  assert.doesNotMatch(sql, /grant select on public\.lesson_cards to anon/);
});

test('baked 6A cards keep their single highlight when the library is copied', () => {
  const sync = require('../scripts/sync-studio-library.js');
  const library = sync.buildLibrary();
  const card = library.cards.find((row) => row.unit_id === 'unit1' && row.track === 'vocab' && row.n === 5);
  assert.equal(card.highlight, 'does voluntary work');
  assert.equal(card.highlight_adv, '');
  assert.equal(card.published.highlight, 'does voluntary work');
  assert.equal(card.published.highlight_adv, '');
  assert.equal(card.ex_en, 'The girl does voluntary work at the elderly home.');
  const source = fs.readFileSync('scripts/sync-studio-library.js', 'utf8');
  assert.match(source, /'highlight', 'highlight_adv', 'img'/);
});
