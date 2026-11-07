const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadScripts } = require('./helpers');

function setup() {
  return loadScripts(['assets/progress-sync.js']).window.ProgressSync;
}

test('username rules reject email addresses', () => {
  const P = setup();
  assert.equal(P.usernameOk('Amy_3'), true);
  assert.equal(P.normalizeUsername(' Amy_3 '), 'amy_3');
  assert.equal(P.emailForUsername('Amy_3'), 'amy_3@learners.localhost');
  assert.equal(P.usernameOk('amy@email.com'), false);
  assert.equal(P.usernameOk('1amy'), false);
  assert.equal(P.usernameOk('ab'), false);
  assert.equal(P.usernameOk('a'.repeat(21)), false);
  assert.equal(P.emailForUsername('amy@email.com'), '');
  assert.equal(P.passwordOk('12345'), false);
  assert.equal(P.passwordOk('123456'), true);
});

test('login domain matches the database trigger', () => {
  const P = setup();
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261106150000_learner_username_progress.sql'), 'utf8');
  assert.ok(sql.includes('@' + P.EMAIL_DOMAIN));
  assert.equal(sql.includes('service_role'), true);
});

test('watched keys match the practice stores', () => {
  const { window } = loadScripts([
    'assets/progress-sync.js',
    'practice/badges.js',
    'practice/mastery.js',
    'assets/profile.js',
    'assets/last-place.js'
  ]);
  assert.equal(window.ProgressSync.KEYS.badges, window.Badges.KEY);
  assert.equal(window.ProgressSync.KEYS.mastery, window.Mastery.KEY);
  assert.equal(window.ProgressSync.KEYS.profile, window.Profile.KEY);
  assert.equal(window.ProgressSync.KEYS.lastPlace, window.LastPlace.KEY);
  assert.equal(window.Mastery.KEY && window.ProgressSync.KEYS.matchBest, 'p6-flash-match-best-v1');
});

test('merge keeps both badges and the earlier date', () => {
  const P = setup();
  const merged = P.merge({
    badges: { earned: { starter: { earnedAt: 20 } }, units: { unit1: { fillEasy: true, fillEasyBest: 0.5 } } },
    mastery: { words: { 'unit1:adopt': { state: 'review', streak: 1, correct: 1, wrong: 1, last: 5 } } },
    matchBest: { unit1: { flips: 12, ms: 4000 } },
    timedBest: { unit1: 3 },
    profile: { nickname: 'Amy', avatar: 'cat' },
    lastPlace: { unitId: 'unit1', n: 1, en: 'adopt a pet', href: 'unit1/index.html#c1' }
  }, {
    badges: { earned: { starter: { earnedAt: 10 }, 'unit-done:unit1': { earnedAt: 30 } }, units: { unit1: { match: true, fillEasyBest: 1 } }, grammarInferenceWins: 2 },
    mastery: { words: { 'unit1:adopt': { state: 'mastered', streak: 3, correct: 4, wrong: 0, last: 9 } } },
    matchBest: { unit1: { flips: 8, ms: 5000 } },
    timedBest: { unit1: 7 },
    profile: { nickname: 'Bo', avatar: 'sun' },
    lastPlace: { unitId: 'unit2', n: 2, en: 'flood', href: 'unit2/index.html#c2' }
  }, { remoteAt: 100, profileAt: 50, lastAt: 200 });
  assert.equal(merged.badges.earned.starter.earnedAt, 10);
  assert.equal(merged.badges.earned['unit-done:unit1'].earnedAt, 30);
  assert.equal(merged.badges.units.unit1.fillEasy, true);
  assert.equal(merged.badges.units.unit1.match, true);
  assert.equal(merged.badges.units.unit1.fillEasyBest, 1);
  assert.equal(merged.badges.grammarInferenceWins, 2);
  assert.equal(merged.mastery.words['unit1:adopt'].state, 'mastered');
  assert.equal(merged.mastery.words['unit1:adopt'].wrong, 1);
  assert.equal(merged.matchBest.unit1.flips, 8);
  assert.equal(merged.timedBest.unit1, 7);
  assert.equal(merged.profile.nickname, 'Bo');
  assert.equal(merged.lastPlace.en, 'adopt a pet');
});

test('anonymous progress asks before it is saved to an account', () => {
  const P = setup();
  const local = P.emptySnapshot();
  local.badges = { earned: { starter: { earnedAt: 1 } } };
  const signIn = P.planHydration({
    local: local,
    remote: P.emptySnapshot(),
    localOwner: '',
    userId: 'user-b',
    choice: '',
    freshAccount: false
  });
  assert.equal(signIn.action, 'apply');
  assert.equal(signIn.upload, false);
  assert.equal(signIn.stashLocalAs, 'anon');
  assert.equal(P.hasProgress(signIn.snapshot), false);
  const ask = P.planHydration({
    local: local,
    remote: P.emptySnapshot(),
    localOwner: '',
    userId: 'user-b',
    choice: '',
    freshAccount: true
  });
  assert.equal(ask.action, 'ask');
  const saved = P.planHydration({
    local: local,
    remote: P.emptySnapshot(),
    localOwner: '',
    userId: 'user-b',
    choice: 'save',
    freshAccount: true
  });
  assert.equal(saved.action, 'apply');
  assert.equal(saved.upload, true);
  assert.equal(saved.snapshot.badges.earned.starter.earnedAt, 1);
  const separate = P.planHydration({
    local: local,
    remote: P.emptySnapshot(),
    localOwner: '',
    userId: 'user-b',
    choice: 'separate',
    freshAccount: true
  });
  assert.equal(separate.upload, false);
  assert.equal(separate.holdAnon, true);
  assert.equal(separate.stashLocalAs, 'anon');
  assert.equal(P.hasProgress(separate.snapshot), false);
});

test('another learner on this device is set aside', () => {
  const P = setup();
  const local = P.emptySnapshot();
  local.profile = { nickname: 'Amy', avatar: 'cat' };
  const remote = P.emptySnapshot();
  remote.badges = { earned: { starter: { earnedAt: 4 } } };
  const plan = P.planHydration({
    local: local,
    remote: remote,
    localOwner: 'user-a',
    userId: 'user-b',
    stashed: P.emptySnapshot()
  });
  assert.equal(plan.action, 'apply');
  assert.equal(plan.stashLocalAs, 'user-a');
  assert.equal(plan.owner, 'user-b');
  assert.equal(plan.snapshot.badges.earned.starter.earnedAt, 4);
  assert.equal(plan.snapshot.profile.nickname || '', '');
});

test('next links stay inside this site', () => {
  const P = setup();
  assert.equal(P.safeNext('unit1/index.html#c3'), 'unit1/index.html#c3');
  assert.equal(P.safeNext('https://evil.example/phish'), '');
  assert.equal(P.safeNext('//evil.example'), '');
  assert.equal(P.safeNext('../secrets'), '');
});
