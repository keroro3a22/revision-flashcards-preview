const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadPacks } = require('./helpers');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"“”‘’]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Each answer phrase owns one clue. A stem is unique when exactly one clue matches.
 * Clues are written so near-synonyms (volunteer vs voluntary work, cruel vs wicked,
 * beat vs mix vs stir) cannot share a sentence.
 */
const CLUES = [
  { phrase: 'adopt a pet', re: /stray|forever home/i },
  { phrase: 'be a volunteer', re: /volunteer badge/i },
  { phrase: 'buy/sell flags', re: /flag day/i },
  { phrase: 'buy/sell raffle tickets', re: /raffle|lucky-draw|lucky draw/i },
  { phrase: 'do voluntary work', re: /without getting paid|without pay|nobody pays/i },
  { phrase: 'donate money', re: /charity box|pocket money/i },
  { phrase: 'give away old books', re: /storybooks/i },
  { phrase: 'go on a walkathon', re: /kilometres|kilometers/i },
  { phrase: 'take part in a fund-raising fair', re: /game stalls/i },
  { phrase: 'visit an elderly home', re: /grandmas|grandpas|elderly people/i },

  { phrase: 'a drought', re: /no rain|little rain|dry up|fields crack/i },
  { phrase: 'an earthquake', re: /ground sh|cups rattled|cups fall/i },
  { phrase: 'a flood', re: /river water|covered the streets|covers the low streets/i },
  { phrase: 'a landslip', re: /hillside|slid down/i },
  { phrase: 'a tsunami', re: /ocean waves|giant waves|seaquake/i },
  { phrase: 'a typhoon', re: /signal 8/i },
  { phrase: 'block roads', re: /cannot pass/i },
  { phrase: 'damage crops', re: /before harvest|rice in the fields/i },
  { phrase: 'destroy buildings', re: /walls fall|walls in ruins|lose their homes/i },
  { phrase: 'injure people', re: /cut arms|bandages/i },

  { phrase: 'beat', re: /\bwhisk\b/i },
  { phrase: 'chop', re: /small pieces/i },
  { phrase: 'mix', re: /evenly blended|evenly combined|flour and sugar|flour and cocoa/i },
  { phrase: 'pour', re: /\bjug\b/i },
  { phrase: 'spread', re: /thin layer/i },
  { phrase: 'sprinkle', re: /lightly on top|scattering it/i },
  { phrase: 'stir', re: /does not stick|nothing sticks/i },
  { phrase: 'peel', re: /\bpeeler\b|no skin/i },
  { phrase: 'bake', re: /\boven\b/i },
  { phrase: 'boil', re: /big bubbles/i },
  { phrase: 'fry', re: /hot oil|oil in the pan|crispy/i },
  { phrase: 'steam', re: /\bsteamer\b/i },

  { phrase: 'an action film', re: /car chases/i },
  { phrase: 'a comedy', re: /\bjokes?\b/i },
  { phrase: 'a fantasy film', re: /talking dragon|magic castle|magic wand|wizards|dragons and magic/i },
  { phrase: 'a horror film', re: /spooky/i },
  { phrase: 'a musical', re: /sing and dance|singing and dancing|songs and dances/i },
  { phrase: 'a science fiction film', re: /robots|space travel|distant planets/i },
  { phrase: 'cruel', re: /on purpose|without reason|for no reason/i },
  { phrase: 'curious', re: /questions/i },
  { phrase: 'lonely', re: /no friends/i },
  { phrase: 'obedient', re: /sit!|stay!/i },
  { phrase: 'selfish', re: /will not share|not share/i },
  { phrase: 'timid', re: /tiny noise|hides behind|hides under|hid under/i },
  { phrase: 'wicked', re: /dark spell/i },
  { phrase: 'wise', re: /good advice/i },
  { phrase: 'as blind as a bat', re: /glasses/i },
  { phrase: 'as busy as a bee', re: /morning to night/i },
  { phrase: 'as free as a bird', re: /no homework|no tasks/i },
  { phrase: 'as strong as an ox', re: /heavy bags/i },
  { phrase: 'as hungry as a wolf', re: /no snack/i }
];

const INFLECTIONS = {
  'does voluntary work': 'do voluntary work'
};

function cluePhrase(answer) {
  return INFLECTIONS[answer] || answer;
}

test('every fill item accepts one phrase and one clue', () => {
  const { window } = loadPacks();
  const packs = [
    window.PRACTICE_UNIT1,
    window.PRACTICE_UNIT2,
    window.PRACTICE_UNIT3,
    window.PRACTICE_UNIT4
  ];
  const problems = [];
  packs.forEach(pack => {
    ['fillIn', 'fillInHard'].forEach(bucket => {
      (pack[bucket] || []).forEach(item => {
        const accepted = [...new Set((item.accept || [item.answer]).map(norm))];
        if (accepted.length !== 1 || accepted[0] !== norm(item.answer)) {
          problems.push(item.id + ' accept is not exactly "' + item.answer + '"');
        }
        const hits = CLUES.filter(c => c.re.test(item.sentence)).map(c => c.phrase);
        const expect = cluePhrase(item.answer);
        if (hits.length !== 1 || hits[0] !== expect) {
          problems.push(item.id + ' clues [' + hits.join(', ') + '] expected ' + expect);
        }
        const escaped = norm(item.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const leak = new RegExp('(?:^|[^a-z])' + escaped + '(?:$|[^a-z])', 'i');
        if (leak.test(item.sentence)) {
          problems.push(item.id + ' already prints the answer');
        }
      });
    });
  });
  assert.deepEqual(problems, []);
});

test('sentence fill hides Meaning on Easy and Hard and has no tip', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'practice/fill.html'), 'utf8');
  assert.doesNotMatch(html, /Meaning:/);
  assert.doesNotMatch(html, /hard-meaning/);
  assert.doesNotMatch(html, /think-tip|think-panel|FillThink|>Tip</);
  assert.doesNotMatch(html, /think\.js/);
});
