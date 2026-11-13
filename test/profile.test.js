const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadScripts } = require('./helpers');

const root = path.join(__dirname, '..');

function setup(badgeEarned) {
  const loaded = loadScripts(['practice/badges.js', 'assets/profile.js']);
  if (badgeEarned) {
    loaded.localStorage.setItem('p6-flash-badges-v1', JSON.stringify({
      earned: badgeEarned,
      units: {},
      hadReview: {}
    }));
  }
  return loaded;
}

test('a new student has no nickname and three free avatars', () => {
  const { window } = setup();
  const P = window.Profile;
  assert.equal(P.load().nickname, '');
  assert.equal(P.load().avatar, 'cat');
  const free = P.list().filter(item => item.free);
  assert.equal(free.length, 3);
  free.forEach(item => {
    assert.equal(item.unlocked, true);
    assert.equal(item.lockLabel, '');
  });
  const locked = P.list().filter(item => !item.free);
  assert.ok(locked.length >= 7);
  locked.forEach(item => {
    assert.equal(item.unlocked, false);
    assert.match(item.lockLabel, /^Unlocks with /);
    assert.match(item.src, /-locked\.png$/);
  });
});

test('nickname is required and the chosen free avatar is saved', () => {
  const { window, localStorage } = setup();
  const P = window.Profile;
  assert.equal(P.save({ nickname: '   ', avatar: 'sun' }).ok, false);
  assert.equal(localStorage.getItem(P.KEY), null);
  const saved = P.save({ nickname: '  Amy Chan  ', avatar: 'sun' });
  assert.equal(saved.ok, true);
  assert.equal(saved.profile.nickname, 'Amy Chan');
  assert.equal(saved.profile.avatar, 'sun');
  const again = P.load();
  assert.equal(again.nickname, 'Amy Chan');
  assert.equal(again.avatar, 'sun');
  assert.equal(P.normalizeName('12345678901234567890'), '1234567890123456');
});

test('a locked badge avatar cannot be saved until that badge is earned', () => {
  const { window, localStorage } = setup();
  const P = window.Profile;
  const blocked = P.save({ nickname: 'Amy', avatar: 'starter' });
  assert.equal(blocked.ok, true);
  assert.equal(blocked.profile.avatar, 'cat');
  localStorage.setItem(P.KEY, JSON.stringify({ nickname: 'Amy', avatar: 'starter' }));
  assert.equal(P.display(P.load()).id, 'cat');

  localStorage.setItem('p6-flash-badges-v1', JSON.stringify({
    earned: { starter: { earnedAt: 1 } },
    units: {},
    hadReview: {}
  }));
  const starter = P.list().find(item => item.id === 'starter');
  assert.equal(starter.unlocked, true);
  assert.equal(starter.src, 'assets/badges/first-steps.png');
  assert.match(P.list().find(item => item.id === 'starter').lockLabel, /^$/);
  const opened = P.list().find(item => item.badgeId === 'starter');
  assert.equal(opened.lockLabel, '');
  const stillLocked = P.list().find(item => item.id === 'hard-challenger');
  assert.match(stillLocked.lockLabel, /Hard Challenger/);
  assert.match(stillLocked.lockLabel, /Hard 挑戰者/);
  assert.equal(P.list().some(item => item.id === 'review-clear'), false);
  const saved = P.save({ nickname: 'Amy', avatar: 'starter' });
  assert.equal(saved.profile.avatar, 'starter');
  assert.equal(P.display().src, 'assets/badges/first-steps.png');
});

test('each badge maps to one avatar', () => {
  const { window } = setup();
  const badgeIds = window.Badges.catalog().map(badge => badge.id);
  badgeIds.forEach(id => {
    const matches = window.Profile.AVATARS.filter(avatar => avatar.badgeId === id);
    assert.equal(matches.length, 1, id);
  });
  const expected = [
    'starter',
    'letters-phrase',
    'match-pro',
    'timed-brave',
    'hard-challenger',
    'unit-done:unit1',
    'unit-done:unit2',
    'unit-done:unit3',
    'unit-done:unit4',
    'unit-done:dictation3'
  ];
  expected.forEach(id => assert.ok(badgeIds.includes(id), id));
});

test('homepage, badges, and practice hub mount the profile chip', () => {
  function read(rel) {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  }
  const home = read('index.html');
  const badges = read('badges/index.html');
  const hub = read('practice/index.html');
  [home, badges].forEach(html => {
    const nav = html.match(/<nav class="nav-plain"[\s\S]*?<\/nav>/)[0];
    assert.equal(nav.includes('profile-slot'), false);
    assert.equal((html.match(/id="profile-slot"/g) || []).length, 1);
    assert.match(html, /assets\/profile\.js/);
    assert.match(html, /assets\/profile\.css/);
  });
  assert.match(hub, /id="profile-slot"/);
  assert.match(hub, /\.\.\/assets\/profile\.js/);
  assert.match(hub, /\.\.\/assets\/profile\.css/);
  const source = read('assets/profile.js');
  assert.match(source, /Nickname/);
  assert.match(source, /Edit profile/);
  assert.match(source, /Make your profile/);
  assert.match(source, /Unlocks with /);
});
