/* Copy the Oxford P6 pages into lesson_cards and practice_items.
   Existing rows are left in place, so a later studio edit is not overwritten.
   Run: node scripts/sync-studio-library.js --write /tmp/studio-sync
*/
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const grammar = require('../practice/grammar/grammar-live.js');

const root = path.join(__dirname, '..');
const PLACE = { book: 'oxford', series: 'oxford', term: 'first', level: 'p6' };

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function extractCards(file) {
  const html = read(file);
  const marker = 'let CARDS = ';
  const at = html.indexOf(marker);
  if (at < 0) throw new Error('No cards in ' + file);
  const start = html.indexOf('[', at);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error('Unfinished cards in ' + file);
}

function loadPack(file, name) {
  const sandbox = { console: console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read(file), sandbox, { filename: file });
  if (!sandbox[name]) throw new Error('Missing ' + name + ' in ' + file);
  return sandbox[name];
}

function text(value) {
  return value == null ? '' : String(value);
}

function cardRow(unit, track, card) {
  const published = {
    en: text(card.en),
    syllables: text(card.syllables),
    zh: text(card.zh),
    pos: text(card.pos),
    ex_en: text(card.ex_en),
    ex_zh: text(card.ex_zh),
    adv_en: text(card.adv_en),
    adv_zh: text(card.adv_zh),
    highlight: text(card.highlight),
    audio: text(card.audio),
    img: text(card.img),
    video: text(card.video),
    pattern: text(card.pattern),
    note_zh: text(card.note_zh)
  };
  if (card.cutout) published.cutout = true;
  if (card.chips) published.chips = card.chips;
  return Object.assign({}, PLACE, {
    unit_id: unit,
    track: track,
    n: card.n,
    en: published.en,
    syllables: published.syllables,
    zh: published.zh,
    pos: published.pos,
    ex_en: published.ex_en,
    ex_zh: published.ex_zh,
    adv_en: published.adv_en,
    adv_zh: published.adv_zh,
    highlight: published.highlight,
    img: published.img,
    audio: published.audio,
    video: published.video,
    pattern: published.pattern,
    note_zh: published.note_zh,
    published: published,
    status: 'published'
  });
}

function listText(options) {
  return Array.isArray(options) ? options.join(' | ') : text(options);
}

function vocabRow(unit, mode, level, n, item) {
  const options = listText(item.options);
  let prompt = '';
  let answer = '';
  const extra = { imported: 'site', kind: mode, id: item.id || '', wordKey: item.wordKey || '' };
  if (mode === 'letters') {
    prompt = text(item.word);
    answer = prompt;
    extra.word = prompt;
    extra.audio = text(item.audio);
  } else if (mode === 'match') {
    prompt = text(item.en);
    answer = text(item.zh);
    extra.en = prompt;
    extra.zh = answer;
    extra.img = text(item.img);
  } else {
    prompt = text(item.sentence);
    answer = text(item.answer);
    extra.sentence = prompt;
    extra.blank = item.blank || '______';
    extra.answer = answer;
    extra.accept = item.accept || [answer];
    extra.explain = text(item.explain);
    extra.options = options;
    extra.img = text(item.img);
  }
  const published = Object.assign({}, extra, {
    prompt: prompt,
    answer: answer,
    explain: text(item.explain),
    options: options,
    sentence: prompt,
    zh: answer
  });
  if (mode === 'letters') published.word = prompt;
  if (mode === 'match') {
    published.en = prompt;
    published.zh = answer;
  }
  return Object.assign({}, PLACE, {
    unit_id: unit,
    track: 'vocab',
    mode: mode,
    level_name: level,
    n: n,
    prompt: prompt,
    answer: answer,
    explain: text(item.explain),
    options: options,
    extra: extra,
    published: published,
    status: 'published'
  });
}

function grammarRows(unit, mode, sets) {
  const rebuilt = grammar.rebuild(grammar.flatten(sets).map(function (body) {
    return { published: body };
  }));
  sameTree(sets, rebuilt, unit + ' ' + mode);
  return grammar.flatten(sets).map(function (body, index) {
    const stored = Object.assign({ imported: 'site' }, body);
    return Object.assign({}, PLACE, {
      unit_id: mode === 'boss' ? 'mixed' : unit,
      track: 'grammar',
      mode: mode,
      level_name: 'easy',
      n: index + 1,
      prompt: body.prompt,
      answer: body.answer,
      explain: body.explain,
      options: body.options,
      extra: stored,
      published: stored,
      status: 'published'
    });
  });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).sort().forEach(function (key) { out[key] = stable(value[key]); });
    return out;
  }
  return value;
}

function sameTree(left, right, label) {
  const encoded = JSON.stringify(stable(left));
  const again = JSON.stringify(stable(right));
  if (encoded !== again) throw new Error('Grammar round-trip changed ' + label);
}

function liveQuestion(body) {
  const options = String(body.options || '').split('|').map(function (part) { return part.trim(); }).filter(Boolean);
  return {
    sentence: body.sentence || body.prompt || '',
    blank: body.blank || '______',
    options: options,
    answer: body.answer || '',
    accept: body.accept || [body.answer || ''],
    explain: body.explain || '',
    word: body.word || body.prompt || '',
    en: body.en || body.prompt || '',
    zh: body.zh || body.answer || '',
    img: body.img || ''
  };
}

function expectVocab(mode, item, row) {
  const got = liveQuestion(row.published);
  if (mode === 'letters') {
    if (got.word !== item.word) throw new Error('Letter mismatch ' + item.word);
    return;
  }
  if (mode === 'match') {
    if (got.en !== item.en || got.zh !== item.zh || got.img !== (item.img || '')) {
      throw new Error('Match mismatch ' + item.en);
    }
    return;
  }
  const options = item.options || [];
  if (got.sentence !== item.sentence || got.answer !== item.answer || got.explain !== (item.explain || '')) {
    throw new Error('Fill mismatch ' + (item.id || item.sentence));
  }
  if (JSON.stringify(got.options) !== JSON.stringify(options)) throw new Error('Options mismatch ' + item.id);
  if (JSON.stringify(got.accept) !== JSON.stringify(item.accept || [item.answer])) throw new Error('Accept mismatch ' + item.id);
}

function addVocab(practice, unit, pack) {
  const modes = [
    ['fill', 'easy', pack.fillIn || []],
    ['fill', 'hard', pack.fillInHard || []],
    ['letters', 'easy', pack.missingLetters || []],
    ['match', 'easy', pack.matching || []],
    ['timed', 'easy', pack.fillIn || []]
  ];
  modes.forEach(function (spec) {
    spec[2].forEach(function (item, index) {
      const row = vocabRow(unit, spec[0], spec[1], index + 1, item);
      expectVocab(spec[0], item, row);
      practice.push(row);
    });
  });
}

function buildLibrary() {
  const cards = [];
  for (let n = 1; n <= 6; n++) {
    const unit = 'unit' + n;
    extractCards(unit + '/index.html').forEach(function (card) { cards.push(cardRow(unit, 'vocab', card)); });
    extractCards(unit + '/grammar/index.html').forEach(function (card) { cards.push(cardRow(unit, 'grammar', card)); });
  }
  const practice = [];
  for (let n = 1; n <= 6; n++) {
    const unit = 'unit' + n;
    addVocab(practice, unit, loadPack('practice/data/' + unit + '.js', 'PRACTICE_UNIT' + n));
  }
  addVocab(practice, 'mixed', loadPack('practice/data/mixed.js', 'PRACTICE_MIXED'));
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(function (unit) {
    ['story', 'chat', 'join'].forEach(function (mode) {
      const sets = grammar.extractSets(read('practice/grammar/' + unit + '-' + mode + '/index.html'));
      if (sets.length !== 5) throw new Error(unit + ' ' + mode + ' has ' + sets.length + ' sets');
      grammarRows(unit, mode, sets).forEach(function (row) { practice.push(row); });
    });
  });
  grammarRows('mixed', 'boss', grammar.extractSets(read('practice/grammar/boss/index.html'))).forEach(function (row) {
    practice.push(row);
  });
  const seen = new Set();
  cards.forEach(function (row) {
    const key = [row.unit_id, row.track, row.n].join('|');
    if (seen.has(key)) throw new Error('Duplicate card ' + key);
    seen.add(key);
  });
  const seenPractice = new Set();
  practice.forEach(function (row) {
    const key = [row.unit_id, row.track, row.mode, row.level_name, row.n].join('|');
    if (seenPractice.has(key)) throw new Error('Duplicate practice ' + key);
    seenPractice.add(key);
  });
  return { cards: cards, practice: practice };
}

function sqlValue(value) {
  if (value == null) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return sqlValue(JSON.stringify(value)) + '::jsonb';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function insertSql(table, columns, rows) {
  if (!rows.length) return '';
  const values = rows.map(function (row) {
    return '(' + columns.map(function (column) { return sqlValue(row[column]); }).join(', ') + ')';
  }).join(',\n');
  const conflict = table === 'lesson_cards'
    ? '(book, series, term, level, unit_id, track, n)'
    : '(book, series, term, level, unit_id, track, mode, level_name, n)';
  return 'insert into public.' + table + ' (' + columns.join(', ') + ')\nvalues\n' + values +
    '\non conflict ' + conflict + ' do nothing;\n';
}

function cutoutSql(cards) {
  const groups = {};
  cards.forEach(function (row) {
    if (!row.published.cutout) return;
    const key = row.unit_id + '|' + row.track;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row.n);
  });
  return Object.keys(groups).map(function (key) {
    const parts = key.split('|');
    return 'update public.lesson_cards set published = jsonb_set(published, \'{cutout}\', \'true\'::jsonb, true)\n' +
      "where book = 'oxford' and series = 'oxford' and term = 'first' and level = 'p6'\n" +
      '  and unit_id = ' + sqlValue(parts[0]) + ' and track = ' + sqlValue(parts[1]) +
      ' and n in (' + groups[key].join(', ') + ')\n' +
      "  and coalesce(published->>'cutout', '') <> 'true';\n";
  }).join('\n');
}

function writeSql(dir, library) {
  fs.mkdirSync(dir, { recursive: true });
  const cardColumns = [
    'book', 'series', 'term', 'level', 'unit_id', 'track', 'n',
    'en', 'syllables', 'zh', 'pos', 'ex_en', 'ex_zh', 'adv_en', 'adv_zh',
    'highlight', 'img', 'audio', 'video', 'pattern', 'note_zh', 'published', 'status'
  ];
  const practiceColumns = [
    'book', 'series', 'term', 'level', 'unit_id', 'track', 'mode', 'level_name', 'n',
    'prompt', 'answer', 'explain', 'options', 'extra', 'published', 'status'
  ];
  const files = [];
  function chunk(name, table, columns, rows, size) {
    for (let i = 0; i < rows.length; i += size) {
      const file = path.join(dir, name + '-' + String(files.length + 1).padStart(3, '0') + '.sql');
      fs.writeFileSync(file, insertSql(table, columns, rows.slice(i, i + size)));
      files.push(file);
    }
  }
  chunk('cards', 'lesson_cards', cardColumns, library.cards, 8);
  chunk('practice', 'practice_items', practiceColumns, library.practice, 12);
  const cutout = path.join(dir, 'cutout.sql');
  fs.writeFileSync(cutout, cutoutSql(library.cards));
  files.push(cutout);
  return files;
}

function summary(library) {
  const cards = {};
  library.cards.forEach(function (row) {
    const key = row.unit_id + ' ' + row.track;
    cards[key] = (cards[key] || 0) + 1;
  });
  const practice = {};
  library.practice.forEach(function (row) {
    const key = row.unit_id + ' ' + row.track + ' ' + row.mode + ' ' + row.level_name;
    practice[key] = (practice[key] || 0) + 1;
  });
  return { cards: cards, practice: practice, cardCount: library.cards.length, practiceCount: library.practice.length };
}

if (require.main === module) {
  const library = buildLibrary();
  const report = summary(library);
  console.log(JSON.stringify(report, null, 2));
  const writeAt = process.argv.indexOf('--write');
  if (writeAt !== -1) {
    const files = writeSql(process.argv[writeAt + 1] || '/tmp/studio-sync', library);
    console.log('wrote ' + files.length + ' files');
  }
}

module.exports = { buildLibrary, summary };
