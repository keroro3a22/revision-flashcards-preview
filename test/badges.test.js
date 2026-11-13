const test = require('node:test');
const assert = require('node:assert/strict');
const { loadScripts } = require('./helpers');

function setup() {
  return loadScripts(['practice/badges.js', 'practice/mastery.js']);
}

test('storage has no score fields', () => {
  const { window, localStorage } = setup();
  window.Badges.recordSession('unit1', 'fill', 'easy');
  const raw = localStorage.getItem(window.Badges.KEY);
  assert.ok(raw);
  assert.equal(raw.includes('totalScore'), false);
  assert.equal(raw.includes('todayScore'), false);
  assert.equal(raw.includes('unitScores'), false);
  const data = JSON.parse(raw);
  assert.equal(Object.prototype.hasOwnProperty.call(data, 'totalScore'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(data, 'todayScore'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(data, 'unitScores'), false);
});

test('review progress rises with each finished practice, not with mastered words', () => {
  const { window } = setup();
  assert.equal(window.Badges.practiceProgress('unit1'), 0);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  assert.equal(window.Badges.practiceProgress('unit1'), 11);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  assert.equal(window.Badges.practiceProgress('unit1'), 11);
  window.Badges.recordSession('unit1', 'letters', 'hard');
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.practiceProgress('unit1'), 33);
  window.Badges.recordSession('unit1', 'fill', 'hard');
  window.Badges.recordSession('unit1', 'letters', 'easy');
  window.Badges.recordSession('unit1', 'timed');
  assert.equal(window.Badges.practiceProgress('unit1'), 67);
  assert.equal(window.Badges.practiceProgress('unit2'), 0);
  window.Badges.recordGrammarSession('unit1', 'story');
  window.Badges.recordGrammarSession('unit1', 'chat');
  window.Badges.recordGrammarSession('unit1', 'join');
  assert.equal(window.Badges.practiceProgress('unit1'), 100);
});

test('起步新手 unlocks after any one finished session', () => {
  const { window } = setup();
  assert.equal(window.Badges.isEarned('starter'), false);
  const result = window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.isEarned('starter'), true);
  assert.equal(result.newBadges.some(b => b.id === 'starter'), true);
  assert.equal(typeof window.Badges.getEarned('starter').earnedAt, 'number');
});

test('earn date stays on a second completion', () => {
  const { window } = setup();
  window.Badges.recordSession('unit1', 'timed');
  const first = window.Badges.getEarned('starter').earnedAt;
  window.Badges.recordSession('unit1', 'timed');
  assert.equal(window.Badges.getEarned('starter').earnedAt, first);
});

test('unit completer needs fill, letters, and match', () => {
  const { window } = setup();
  window.Badges.recordSession('unit1', 'fill', 'easy');
  window.Badges.recordSession('unit1', 'letters', 'hard');
  assert.equal(window.Badges.isEarned('unit-done:unit1'), false);
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.isEarned('unit-done:unit1'), true);
  assert.equal(window.Badges.coreComplete('unit1'), true);
});

test('hard fill counts as the fill core, not as easy', () => {
  const { window } = setup();
  window.Badges.recordSession('unit1', 'fill', 'hard');
  window.Badges.recordSession('unit1', 'letters', 'easy');
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.coreComplete('unit1'), true);
  assert.equal(window.Badges.hardUnlocked('unit1', 'fill'), false);
  assert.equal(window.Badges.hardUnlocked('unit1', 'letters'), true);
});

test('unit 1 and dictation 3 are open and later units wait for the previous core', () => {
  const { window } = setup();
  assert.equal(window.Badges.unitUnlocked('unit1'), true);
  assert.equal(window.Badges.unitUnlocked('dictation3'), true);
  assert.equal(window.Badges.lockReason('dictation3'), '');
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  window.Badges.recordSession('unit1', 'letters', 'easy');
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.unitUnlocked('unit2'), true);
  assert.equal(window.Badges.unitUnlocked('unit3'), false);
  assert.equal(window.Badges.unitUnlocked('dictation3'), true);
});

test('units 2 to 4 stay gated and dictation 3 stays open', () => {
  const { window } = setup();
  assert.equal(window.Badges.unitUnlocked('dictation3'), true);
  assert.equal(window.Badges.unitUnlocked('unit4'), false);
  ['unit1', 'unit2'].forEach(id => {
    window.Badges.recordSession(id, 'fill', 'easy');
    window.Badges.recordSession(id, 'letters', 'easy');
    window.Badges.recordSession(id, 'match');
  });
  assert.equal(window.Badges.unitUnlocked('unit3'), true);
  assert.equal(window.Badges.unitUnlocked('unit4'), false);
  assert.equal(window.Badges.unitUnlocked('dictation3'), true);
  window.Badges.recordSession('unit3', 'fill', 'easy');
  window.Badges.recordSession('unit3', 'letters', 'easy');
  window.Badges.recordSession('unit3', 'match');
  assert.equal(window.Badges.unitUnlocked('unit4'), true);
  assert.equal(window.Badges.unitUnlocked('dictation3'), true);
});

test('easy unlocks hard for that same practice only', () => {
  const { window } = setup();
  assert.equal(window.Badges.hardUnlocked('unit1', 'fill'), false);
  assert.equal(window.Badges.hardUnlocked('unit1', 'letters'), false);
  assert.equal(window.Badges.hardUnlocked('unit1', 'match'), false);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  assert.equal(window.Badges.hardUnlocked('unit1', 'fill'), true);
  assert.equal(window.Badges.hardUnlocked('unit1', 'letters'), false);
  assert.equal(window.Badges.hardUnlocked('unit1', 'match'), false);
  window.Badges.recordSession('unit1', 'letters', 'easy');
  assert.equal(window.Badges.hardUnlocked('unit1', 'letters'), true);
  assert.equal(window.Badges.hardUnlocked('unit2', 'letters'), false);
  window.Badges.recordSession('unit2', 'letters', 'easy');
  assert.equal(window.Badges.hardUnlocked('unit2', 'letters'), true);
  assert.equal(window.Badges.hardUnlocked('unit2', 'fill'), false);
});

test('phrase speller needs Missing Letters Easy at 100% for units 1 to 4', () => {
  const { window, localStorage } = setup();
  ['unit1', 'unit2', 'unit3'].forEach(id => {
    window.Badges.recordSession(id, 'letters', 'easy', { correct: 10, total: 10 });
  });
  window.Badges.recordSession('unit4', 'letters', 'easy', { correct: 9, total: 10 });
  assert.equal(window.Badges.isEarned('letters-phrase'), false);
  window.Badges.recordSession('dictation3', 'letters', 'easy', { correct: 10, total: 10 });
  assert.equal(window.Badges.isEarned('letters-phrase'), false);
  window.Badges.recordSession('unit4', 'letters', 'easy', { correct: 8, total: 8 });
  assert.equal(window.Badges.isEarned('letters-phrase'), true);
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit4.lettersEasyBest, 1);
  assert.ok(saved.units.unit4.lettersEasyBest > 0.9);
});

test('an earlier imperfect letters session can be upgraded', () => {
  const { window, localStorage } = setup();
  window.Badges.recordSession('unit1', 'letters', 'easy', { correct: 5, total: 10 });
  let saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit1.lettersEasy, true);
  assert.ok(saved.units.unit1.lettersEasyBest < 1);
  window.Badges.recordSession('unit1', 'letters', 'easy', { correct: 4, total: 10 });
  saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit1.lettersEasyBest, 0.5);
});

test('match master and timed hero need units 1 to 4, not dictation 3', () => {
  const { window } = setup();
  ['unit1', 'unit2', 'unit3'].forEach(id => window.Badges.recordSession(id, 'match'));
  window.Badges.recordSession('dictation3', 'match');
  assert.equal(window.Badges.isEarned('match-pro'), false);
  window.Badges.recordSession('unit4', 'match');
  assert.equal(window.Badges.isEarned('match-pro'), true);
  ['unit1', 'unit2', 'unit3'].forEach(id => window.Badges.recordSession(id, 'timed', null, { correct: 3, total: 5 }));
  assert.equal(window.Badges.isEarned('timed-brave'), false);
  window.Badges.recordSession('unit4', 'timed', null, { correct: 1, total: 4 });
  assert.equal(window.Badges.isEarned('timed-brave'), true);
});

test('hard challenger needs fill hard and letters hard at 90% for units 1 to 4', () => {
  const { window } = setup();
  const units = ['unit1', 'unit2', 'unit3', 'unit4'];
  units.forEach(id => {
    window.Badges.recordSession(id, 'fill', 'hard', { correct: 9, total: 10 });
    window.Badges.recordSession(id, 'letters', 'hard', { correct: 9, total: 10 });
  });
  window.Badges.recordSession('unit4', 'letters', 'hard', { correct: 8, total: 10 });
  assert.equal(window.Badges.isEarned('hard-challenger'), true);
  const fresh = setup();
  ['unit1', 'unit2', 'unit3'].forEach(id => {
    fresh.window.Badges.recordSession(id, 'fill', 'hard', { correct: 9, total: 10 });
    fresh.window.Badges.recordSession(id, 'letters', 'hard', { correct: 9, total: 10 });
  });
  fresh.window.Badges.recordSession('unit4', 'fill', 'hard', { correct: 9, total: 10 });
  fresh.window.Badges.recordSession('unit4', 'letters', 'hard', { correct: 89, total: 100 });
  assert.equal(fresh.window.Badges.isEarned('hard-challenger'), false);
  fresh.window.Badges.recordSession('unit4', 'letters', 'hard', { correct: 90, total: 100 });
  assert.equal(fresh.window.Badges.isEarned('hard-challenger'), true);
  fresh.window.Badges.recordSession('dictation3', 'fill', 'hard', { correct: 1, total: 10 });
  assert.equal(fresh.window.Badges.isEarned('unit-done:dictation3'), false);
});

test('catalog lists five unit badges and no streak badge', () => {
  const { window } = setup();
  const ids = window.Badges.catalog().map(b => b.id);
  assert.equal(ids.filter(id => id.indexOf('unit-done:') === 0).length, 5);
  assert.ok(ids.includes('starter'));
  assert.ok(ids.includes('letters-phrase'));
  assert.ok(ids.includes('match-pro'));
  assert.ok(ids.includes('timed-brave'));
  assert.ok(ids.includes('hard-challenger'));
  assert.equal(ids.includes('review-clear'), false);
  assert.equal(ids.some(id => /streak|連續/.test(id)), false);
  const titles = window.Badges.catalog().map(b => b.title);
  assert.ok(titles.includes('起步新手'));
  assert.ok(titles.includes('詞組拼寫手'));
  assert.ok(titles.includes('配對高手'));
  assert.ok(titles.includes('限時勇者'));
  assert.ok(titles.includes('Hard 挑戰者'));
  assert.equal(titles.includes('錯題殺手'), false);
  assert.ok(titles.includes('Unit 完成者'));
  const english = {
    starter: 'First Steps',
    'letters-phrase': 'Phrase Speller',
    'match-pro': 'Match Master',
    'timed-brave': 'Timed Hero',
    'hard-challenger': 'Hard Challenger',
    'grammar-story': 'Story Reader',
    'grammar-inference': 'Inference Ace',
    'grammar-join': 'Sentence Linker',
    'grammar-boss': 'Boss Beater'
  };
  ['grammar-story', 'grammar-inference', 'grammar-join', 'grammar-boss'].forEach(id => {
    assert.ok(ids.includes(id), id);
  });
  window.Badges.catalog().forEach(b => {
    assert.equal(typeof b.english, 'string');
    assert.match(b.english, /[A-Za-z]/);
    assert.match(b.image, /^assets\/badges\/[a-z0-9-]+\.png$/);
    if (english[b.id]) assert.equal(b.english, english[b.id]);
    if (b.id.indexOf('unit-done:') === 0) {
      assert.equal(b.english, 'Unit Completer');
      assert.match(b.image, /^assets\/badges\/unit-completer-[a-z0-9]+\.png$/);
    }
  });
  const unitImages = window.Badges.catalog()
    .filter(b => b.id.indexOf('unit-done:') === 0)
    .map(b => b.image);
  assert.equal(new Set(unitImages).size, 5);
});

test('a newly earned badge carries its English title and medal path', () => {
  const { window } = setup();
  const result = window.Badges.recordSession('unit1', 'fill', 'easy');
  const starter = result.newBadges.find(b => b.id === 'starter');
  assert.equal(starter.title, '起步新手');
  assert.equal(starter.english, 'First Steps');
  assert.equal(starter.image, 'assets/badges/first-steps.png');
  const listed = window.Badges.listWithStatus().find(b => b.id === 'starter');
  assert.equal(listed.earned, true);
  assert.equal(listed.english, 'First Steps');
  const locked = window.Badges.listWithStatus().find(b => b.id === 'match-pro');
  assert.equal(locked.earned, false);
  assert.equal(locked.english, 'Match Master');
  assert.equal(locked.image, 'assets/badges/match-master.png');
  const fs = require('fs');
  const path = require('path');
  window.Badges.catalog().forEach(b => {
    const color = path.join(__dirname, '..', b.image);
    const gray = color.replace(/\.png$/, '-locked.png');
    assert.equal(fs.existsSync(color), true);
    assert.equal(fs.existsSync(gray), true);
  });
});

test('units 1 to 4 count three grammar modes and dictation 3 stays vocab-only', () => {
  const { window, localStorage } = setup();
  window.Badges.recordSession('dictation3', 'fill', 'easy');
  assert.equal(window.Badges.practiceProgress('dictation3'), 17);
  window.Badges.recordGrammarSession('dictation3', 'story');
  assert.equal(window.Badges.practiceProgress('dictation3'), 17);
  window.Badges.recordSession('mixed', 'fill', 'easy');
  window.Badges.recordSession('mixed', 'fill', 'hard');
  window.Badges.recordSession('mixed', 'letters', 'easy');
  window.Badges.recordSession('mixed', 'letters', 'hard');
  window.Badges.recordSession('mixed', 'match');
  window.Badges.recordSession('mixed', 'timed');
  assert.equal(window.Badges.practiceProgress('mixed'), 100);
  window.Badges.recordGrammarSession('unit1', 'story');
  assert.equal(window.Badges.coreComplete('unit1'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit1.grammarStory, true);
  assert.equal(saved.units.unit1.grammarChat, false);
  assert.equal(saved.units.unit1.grammarJoin, false);
});

test('story and join badges need units 1 to 4 and do not open the next unit', () => {
  const { window } = setup();
  ['unit1', 'unit2', 'unit3'].forEach(id => {
    window.Badges.recordGrammarSession(id, 'story');
    window.Badges.recordGrammarSession(id, 'join');
  });
  assert.equal(window.Badges.isEarned('grammar-story'), false);
  assert.equal(window.Badges.isEarned('grammar-join'), false);
  assert.equal(window.Badges.coreComplete('unit1'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
  const story = window.Badges.recordGrammarSession('unit4', 'story');
  assert.equal(window.Badges.isEarned('grammar-story'), true);
  assert.equal(story.newBadges.some(b => b.id === 'grammar-story'), true);
  assert.equal(story.newBadges.find(b => b.id === 'grammar-story').english, 'Story Reader');
  assert.equal(window.Badges.isEarned('grammar-join'), false);
  const join = window.Badges.recordGrammarSession('unit4', 'join');
  assert.equal(window.Badges.isEarned('grammar-join'), true);
  assert.equal(join.newBadges.some(b => b.id === 'grammar-join'), true);
  const earnedAt = window.Badges.getEarned('grammar-story').earnedAt;
  const again = window.Badges.recordGrammarSession('unit4', 'story');
  assert.equal(again.newBadges.some(b => b.id === 'grammar-story'), false);
  assert.equal(window.Badges.getEarned('grammar-story').earnedAt, earnedAt);
});

test('inference ace counts correct chat mysteries and boss beater needs a life left', () => {
  const { window, localStorage } = setup();
  window.Badges.recordGrammarInference();
  window.Badges.recordGrammarInference();
  assert.equal(window.Badges.isEarned('grammar-inference'), false);
  const third = window.Badges.recordGrammarInference();
  assert.equal(window.Badges.isEarned('grammar-inference'), true);
  assert.equal(third.newBadges.some(b => b.id === 'grammar-inference'), true);
  assert.equal(third.newBadges.find(b => b.id === 'grammar-inference').title, '推理高手');
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.grammarInferenceWins, 3);
  const firstAt = window.Badges.getEarned('grammar-inference').earnedAt;
  window.Badges.recordGrammarInference();
  assert.equal(window.Badges.getEarned('grammar-inference').earnedAt, firstAt);
  assert.equal(JSON.parse(localStorage.getItem(window.Badges.KEY)).grammarInferenceWins, 4);
  const miss = window.Badges.recordGrammarBoss(0);
  assert.equal(window.Badges.isEarned('grammar-boss'), false);
  assert.equal(miss.newBadges.length, 0);
  const clear = window.Badges.recordGrammarBoss(1);
  assert.equal(window.Badges.isEarned('grammar-boss'), true);
  assert.equal(clear.newBadges.some(b => b.id === 'grammar-boss' && b.english === 'Boss Beater'), true);
  assert.equal(window.Badges.recordGrammarBoss(3).newBadges.some(b => b.id === 'grammar-boss'), false);
  assert.equal(window.Badges.coreComplete('unit1'), false);
});

test('grammar catalog copy is listed for the shared badges page', () => {
  const { window } = setup();
  const byId = {};
  window.Badges.catalog().forEach(b => { byId[b.id] = b; });
  assert.equal(byId['grammar-story'].title, '故事閱讀員');
  assert.equal(byId['grammar-story'].detail, 'Finish Story Book in Units 1–4.');
  assert.equal(byId['grammar-story'].image, 'assets/badges/story-reader.png');
  assert.equal(byId['grammar-inference'].title, '推理高手');
  assert.equal(byId['grammar-inference'].detail, 'Get the Chat Quest mystery right 3 times.');
  assert.equal(byId['grammar-inference'].image, 'assets/badges/inference-ace.png');
  assert.equal(byId['grammar-join'].title, '組句高手');
  assert.equal(byId['grammar-join'].detail, 'Finish Join the sentences in Units 1–4.');
  assert.equal(byId['grammar-join'].image, 'assets/badges/sentence-linker.png');
  assert.equal(byId['grammar-boss'].title, 'Boss 挑戰者');
  assert.equal(byId['grammar-boss'].detail, 'Clear Boss Round with at least 1 life left.');
  assert.equal(byId['grammar-boss'].image, 'assets/badges/boss-beater.png');
  const listed = window.Badges.listWithStatus().map(b => b.english);
  assert.ok(listed.includes('Story Reader'));
  assert.ok(listed.includes('Inference Ace'));
  assert.ok(listed.includes('Sentence Linker'));
  assert.ok(listed.includes('Boss Beater'));
});

test('progress counts units and activities toward each badge target', () => {
  const { window } = setup();
  const starter = window.Badges.progress('starter');
  assert.equal(starter.current, 0);
  assert.equal(starter.raw, 0);
  assert.equal(starter.target, 1);
  assert.equal(window.Badges.progress('match-pro').target, 4);
  assert.equal(window.Badges.progress('unit-done:unit1').target, 3);
  assert.equal(window.Badges.progress('grammar-boss').target, 1);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  assert.equal(window.Badges.progress('starter').current, 1);
  assert.equal(window.Badges.progress('unit-done:unit1').current, 1);
  window.Badges.recordSession('unit1', 'letters', 'easy', { correct: 10, total: 10 });
  window.Badges.recordSession('unit2', 'letters', 'easy', { correct: 9, total: 10 });
  assert.equal(window.Badges.progress('letters-phrase').current, 1);
  assert.equal(window.Badges.progress('letters-phrase').target, 4);
  window.Badges.recordSession('mixed', 'match');
  window.Badges.recordSession('mixed', 'timed');
  assert.equal(window.Badges.progress('all-rounder').current, 2);
  assert.equal(window.Badges.progress('all-rounder').target, 4);
});

test('inference target and pep lines come from the published overlay', () => {
  const { window, localStorage } = setup();
  window.Badges.applyOverlay([{
    id: 'grammar-inference',
    title: '推理明星',
    english: 'Mystery Star',
    detail: 'Get the mystery right 2 times.',
    target: 2,
    milestones: [
      { at: 1, message: '  First mystery. Keep going.  ' },
      { at: 2, message: 'This one is the unlock line.' },
      { at: 1, message: 'duplicate' }
    ]
  }]);
  const first = window.Badges.recordGrammarInference();
  assert.equal(window.Badges.isEarned('grammar-inference'), false);
  assert.equal(first.nudges.length, 1);
  assert.equal(first.nudges[0].at, 1);
  assert.equal(first.nudges[0].message, 'First mystery. Keep going.');
  const again = window.Badges.recordGrammarInference();
  assert.equal(again.nudges.length, 0);
  assert.equal(window.Badges.isEarned('grammar-inference'), true);
  assert.equal(again.newBadges[0].title, '推理明星');
  assert.equal(again.newBadges[0].english, 'Mystery Star');
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.deepEqual(saved.nudgesSeen['grammar-inference'], [1]);
  const listed = window.Badges.listWithStatus().find(b => b.id === 'grammar-inference');
  assert.equal(listed.title, '推理明星');
  assert.equal(listed.detail, 'Get the mystery right 2 times.');
  assert.equal(listed.current, 2);
  assert.equal(listed.target, 2);
});

test('a higher inference target leaves an earned badge in place', () => {
  const { window } = setup();
  window.Badges.recordGrammarInference();
  window.Badges.recordGrammarInference();
  window.Badges.recordGrammarInference();
  window.Badges.applyOverlay([{ id: 'grammar-inference', target: 10 }]);
  assert.equal(window.Badges.isEarned('grammar-inference'), true);
  const progress = window.Badges.progress('grammar-inference');
  assert.equal(progress.target, 10);
  assert.equal(progress.current, 10);
  assert.equal(progress.raw, 3);
});

test('lowering the inference target grants the badge when settings are applied', () => {
  const { window } = setup();
  window.Badges.recordGrammarInference();
  window.Badges.applyOverlay([{ id: 'grammar-inference', target: 10 }]);
  assert.equal(window.Badges.isEarned('grammar-inference'), false);
  window.Badges.applyOverlay([{ id: 'grammar-inference', target: 1 }]);
  const caught = window.Badges.catchUp();
  assert.equal(window.Badges.isEarned('grammar-inference'), true);
  assert.equal(caught.newBadges.some(b => b.id === 'grammar-inference'), true);
});

test('pep steps below 1 or at the target are dropped', () => {
  const { window } = setup();
  const clean = window.Badges.cleanMilestones([
    { at: 1, message: '  Go on.  ' },
    { at: 4, message: 'Too far' },
    { at: 1, message: 'Second' },
    { at: 2, message: '' }
  ], 4);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].at, 1);
  assert.equal(clean[0].message, 'Go on.');
});

test('an unlock dialog is queued ahead of a pep dialog', () => {
  const { window, localStorage } = setup();
  window.Badges.applyOverlay([{
    id: 'match-pro',
    milestones: [{ at: 1, message: 'One unit matched.' }]
  }]);
  window.Badges.recordSession('unit1', 'match');
  const pending = JSON.parse(localStorage.getItem(window.Badges.POPUP_KEY));
  assert.equal(pending[0].kind, 'unlock');
  assert.equal(pending[0].id, 'starter');
  assert.equal(pending[1].kind, 'nudge');
  assert.equal(pending[1].id, 'match-pro');
  assert.equal(pending[1].message, 'One unit matched.');
  window.Badges.clearPopups();
  assert.equal(localStorage.getItem(window.Badges.POPUP_KEY), null);
});

test('mastery still tracks review words without awarding a badge', () => {
  const { window } = setup();
  const M = window.Mastery;
  M.markWrong('unit2:flood');
  assert.equal(M.get('unit2:flood').state, 'review');
  M.markCorrect('unit2:flood');
  M.markCorrect('unit2:flood');
  M.markCorrect('unit2:flood');
  assert.equal(M.get('unit2:flood').state, 'mastered');
  assert.equal(window.Badges.catalog().some(b => b.id === 'review-clear'), false);
});
