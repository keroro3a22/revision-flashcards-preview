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

test('core still needs fill, letters, and match and awards no unit badge', () => {
  const { window } = setup();
  window.Badges.recordSession('unit1', 'fill', 'easy');
  window.Badges.recordSession('unit1', 'letters', 'hard');
  assert.equal(window.Badges.coreComplete('unit1'), false);
  assert.equal(window.Badges.catalog().some(b => b.id === 'unit-done:unit1'), false);
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.coreComplete('unit1'), true);
  assert.equal(window.Badges.isEarned('unit-done:unit1'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), true);
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

test('phrase speller needs 3 different all-correct Missing Letters sets', () => {
  const { window, localStorage } = setup();
  window.Badges.recordSession('unit1', 'letters', 'easy', { correct: 10, total: 10 });
  window.Badges.recordSession('unit1', 'letters', 'hard', { correct: 10, total: 10 });
  window.Badges.recordSession('unit2', 'letters', 'hard', { correct: 8, total: 8 });
  assert.equal(window.Badges.progress('letters-phrase').raw, 2);
  window.Badges.recordSession('unit5', 'letters', 'easy', { correct: 9, total: 10 });
  assert.equal(window.Badges.isEarned('letters-phrase'), false);
  window.Badges.recordSession('unit5', 'letters', 'hard', { correct: 4, total: 4 });
  assert.equal(window.Badges.isEarned('letters-phrase'), true);
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit5.lettersHardBest, 1);
  assert.equal(saved.units.unit1.sets.letters.unit1, 1);
  assert.deepEqual(Object.keys(saved.units.unit1.sets.letters), ['unit1']);
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

test('match master and timed hero need 3 different sets', () => {
  const { window, localStorage } = setup();
  window.Badges.recordSession('unit1', 'match');
  window.Badges.recordSession('unit1', 'match');
  window.Badges.recordSession('unit5', 'match');
  assert.equal(window.Badges.progress('match-pro').raw, 2);
  assert.equal(window.Badges.isEarned('match-pro'), false);
  window.Badges.recordSession('dictation3', 'match');
  assert.equal(window.Badges.isEarned('match-pro'), true);
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.deepEqual(saved.units.unit1.sets.match, { unit1: true });
  window.Badges.recordSession('unit1', 'timed', null, { correct: 3, total: 5 });
  window.Badges.recordSession('unit6', 'timed', null, { correct: 1, total: 4 });
  assert.equal(window.Badges.isEarned('timed-brave'), false);
  window.Badges.recordSession('mixed', 'timed', null, { correct: 1, total: 4 });
  assert.equal(window.Badges.isEarned('timed-brave'), true);
});

test('hard challenger needs 3 fill hard sets and 3 letters hard sets at 90%', () => {
  const { window, localStorage } = setup();
  window.Badges.recordSession('unit1', 'fill', 'hard', { correct: 9, total: 10 }, 1);
  window.Badges.recordSession('unit1', 'fill', 'hard', { correct: 9, total: 10 }, 1);
  window.Badges.recordSession('unit1', 'fill', 'hard', { correct: 8, total: 10 }, 1);
  window.Badges.recordSession('unit1', 'fill', 'hard', { correct: 9, total: 10 }, 2);
  window.Badges.recordSession('unit5', 'fill', 'hard', { correct: 90, total: 100 }, 1);
  ['unit2', 'unit6', 'dictation3'].forEach(id => {
    window.Badges.recordSession(id, 'letters', 'hard', { correct: 9, total: 10 });
  });
  assert.equal(window.Badges.progress('hard-challenger').raw, 3);
  assert.equal(window.Badges.isEarned('hard-challenger'), true);
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit1.sets.fillHard['1'], 0.9);
  assert.equal(saved.units.unit1.sets.fillHard['2'], 0.9);
  assert.equal(Object.keys(saved.units.unit1.sets.fillHard).length, 2);
  const fresh = setup();
  fresh.window.Badges.recordSession('unit1', 'fill', 'hard', { correct: 9, total: 10 }, 1);
  fresh.window.Badges.recordSession('unit2', 'fill', 'hard', { correct: 9, total: 10 }, 1);
  fresh.window.Badges.recordSession('unit3', 'fill', 'hard', { correct: 89, total: 100 }, 1);
  ['unit4', 'unit5', 'unit6'].forEach(id => {
    fresh.window.Badges.recordSession(id, 'letters', 'hard', { correct: 9, total: 10 });
  });
  assert.equal(fresh.window.Badges.progress('hard-challenger').raw, 2);
  assert.equal(fresh.window.Badges.isEarned('hard-challenger'), false);
  fresh.window.Badges.recordSession('unit3', 'fill', 'hard', { correct: 90, total: 100 }, 1);
  assert.equal(fresh.window.Badges.isEarned('hard-challenger'), true);
  const easy = setup();
  ['unit1', 'unit2', 'unit3'].forEach(id => {
    easy.window.Badges.recordSession(id, 'fill', 'hard', { correct: 9, total: 10 }, 1);
    easy.window.Badges.recordSession(id, 'letters', 'easy', { correct: 10, total: 10 });
  });
  assert.equal(easy.window.Badges.isEarned('letters-phrase'), true);
  assert.equal(easy.window.Badges.isEarned('hard-challenger'), false);
});

test('catalog lists the eleven practice badges and no unit completer', () => {
  const { window } = setup();
  const catalog = window.Badges.catalog();
  const ids = Array.from(catalog.map(b => b.id));
  assert.deepEqual(ids, [
    'starter',
    'match-pro',
    'timed-brave',
    'grammar-story',
    'grammar-join',
    'grammar-chat',
    'grammar-inference',
    'grammar-boss',
    'all-rounder',
    'letters-phrase',
    'hard-challenger'
  ]);
  const details = {
    starter: 'Finish any one practice, including Grammar.',
    'match-pro': 'Finish 3 different Memory Match sets.',
    'timed-brave': 'Finish 3 different Timed Challenge sets.',
    'grammar-story': 'Finish 3 different Story Book sets.',
    'grammar-join': 'Finish 3 different Join the sentences sets.',
    'grammar-chat': 'Finish 3 different Chat Quest sets.',
    'grammar-inference': 'Get the Chat Quest mystery right 3 times.',
    'grammar-boss': 'Clear Boss Round with at least 1 life left.',
    'all-rounder': 'Finish Fill, Letters, Match, and Timed once each, in the same book or in Mixed topic.',
    'letters-phrase': 'Finish 3 different Missing Letters sets, all correct each time.',
    'hard-challenger': 'Finish 3 different Fill Hard sets and 3 different Letters Hard sets, each at least 90% correct.'
  };
  const blob = JSON.stringify(catalog);
  assert.equal(blob.includes('unit-done:'), false);
  assert.equal(blob.includes('畢業生'), false);
  assert.equal(blob.includes('連續'), false);
  assert.equal(blob.includes('錯題殺手'), false);
  assert.equal(blob.includes('Any unit or level counts'), false);
  assert.equal(blob.includes('任何單元或年級都算'), false);
  catalog.forEach(b => {
    assert.equal(b.detail, details[b.id]);
    assert.equal(window.Badges.listWithStatus().find(row => row.id === b.id).countEditable, b.id === 'grammar-inference');
    if (b.id === 'grammar-inference') assert.equal(window.Badges.targetLimit(b.id), 99);
    else assert.equal(window.Badges.targetLimit(b.id), window.Badges.builtinTarget(b.id));
    if (b.id === 'grammar-chat') assert.equal(b.image, 'assets/badges/chat-practiser.png');
    else assert.match(b.image, /^assets\/badges\/[a-z0-9-]+\.png$/);
  });
  assert.equal(window.Badges.builtinTarget('starter'), 1);
  assert.equal(window.Badges.builtinTarget('grammar-boss'), 1);
  assert.equal(window.Badges.builtinTarget('all-rounder'), 4);
  assert.equal(window.Badges.builtinTarget('hard-challenger'), 3);
  assert.equal(window.Badges.builtinTarget('grammar-chat'), 3);
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
    assert.equal(fs.existsSync(color), true, b.id);
    assert.equal(fs.existsSync(gray), true, b.id);
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

test('story and join need 3 different sets and do not open the next unit', () => {
  const { window } = setup();
  window.Badges.recordGrammarSession('unit1', 'story', 1);
  window.Badges.recordGrammarSession('unit1', 'story', 1);
  window.Badges.recordGrammarSession('unit5', 'story', 1);
  window.Badges.recordGrammarSession('unit1', 'join', 1);
  assert.equal(window.Badges.progress('grammar-story').raw, 2);
  assert.equal(window.Badges.isEarned('grammar-story'), false);
  assert.equal(window.Badges.isEarned('grammar-join'), false);
  assert.equal(window.Badges.coreComplete('unit1'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
  const story = window.Badges.recordGrammarSession('unit6', 'story', 2);
  assert.equal(window.Badges.isEarned('grammar-story'), true);
  assert.equal(story.newBadges.some(b => b.id === 'grammar-story'), true);
  assert.equal(story.newBadges.find(b => b.id === 'grammar-story').english, 'Story Reader');
  window.Badges.recordGrammarSession('unit1', 'join', 2);
  const join = window.Badges.recordGrammarSession('unit2', 'join', 1);
  assert.equal(window.Badges.isEarned('grammar-join'), true);
  assert.equal(join.newBadges.some(b => b.id === 'grammar-join'), true);
  const earnedAt = window.Badges.getEarned('grammar-story').earnedAt;
  const again = window.Badges.recordGrammarSession('unit6', 'story', 2);
  assert.equal(again.newBadges.some(b => b.id === 'grammar-story'), false);
  assert.equal(window.Badges.getEarned('grammar-story').earnedAt, earnedAt);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
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
  assert.equal(window.Badges.isEarned('starter'), false);
  const miss = window.Badges.recordGrammarBoss(0);
  assert.equal(window.Badges.isEarned('grammar-boss'), false);
  assert.equal(window.Badges.isEarned('starter'), false);
  assert.equal(miss.newBadges.length, 0);
  const clear = window.Badges.recordGrammarBoss(1);
  assert.equal(window.Badges.isEarned('grammar-boss'), true);
  assert.equal(window.Badges.isEarned('starter'), true);
  assert.equal(clear.newBadges.some(b => b.id === 'grammar-boss' && b.english === 'Boss Beater'), true);
  assert.equal(window.Badges.recordGrammarBoss(3).newBadges.some(b => b.id === 'grammar-boss'), false);
  assert.equal(window.Badges.coreComplete('unit1'), false);
});

test('grammar catalog copy is listed for the shared badges page', () => {
  const { window } = setup();
  const byId = {};
  window.Badges.catalog().forEach(b => { byId[b.id] = b; });
  assert.equal(byId['grammar-story'].title, '故事閱讀員');
  assert.equal(byId['grammar-story'].detail, 'Finish 3 different Story Book sets.');
  assert.equal(byId['grammar-story'].image, 'assets/badges/story-reader.png');
  assert.equal(byId['grammar-chat'].title, '對話練習生');
  assert.equal(byId['grammar-chat'].english, 'Chat Practiser');
  assert.equal(byId['grammar-chat'].detail, 'Finish 3 different Chat Quest sets.');
  assert.equal(byId['grammar-chat'].image, 'assets/badges/chat-practiser.png');
  assert.equal(byId['grammar-inference'].title, '推理高手');
  assert.equal(byId['grammar-inference'].detail, 'Get the Chat Quest mystery right 3 times.');
  assert.equal(byId['grammar-inference'].image, 'assets/badges/inference-ace.png');
  assert.equal(byId['grammar-join'].title, '組句高手');
  assert.equal(byId['grammar-join'].detail, 'Finish 3 different Join the sentences sets.');
  assert.equal(byId['grammar-join'].image, 'assets/badges/sentence-linker.png');
  assert.equal(byId['grammar-boss'].title, 'Boss 挑戰者');
  assert.equal(byId['grammar-boss'].detail, 'Clear Boss Round with at least 1 life left.');
  assert.equal(byId['grammar-boss'].image, 'assets/badges/boss-beater.png');
  const listed = window.Badges.listWithStatus().map(b => b.english);
  assert.ok(listed.includes('Story Reader'));
  assert.ok(listed.includes('Chat Practiser'));
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
  assert.equal(window.Badges.progress('match-pro').target, 3);
  assert.equal(window.Badges.progress('grammar-chat').target, 3);
  assert.equal(window.Badges.progress('hard-challenger').target, 3);
  assert.equal(window.Badges.progress('grammar-boss').target, 1);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  assert.equal(window.Badges.progress('starter').current, 1);
  window.Badges.recordSession('unit1', 'letters', 'easy', { correct: 10, total: 10 });
  window.Badges.recordSession('unit2', 'letters', 'easy', { correct: 9, total: 10 });
  assert.equal(window.Badges.progress('letters-phrase').current, 1);
  assert.equal(window.Badges.progress('letters-phrase').target, 3);
  window.Badges.recordSession('mixed', 'match');
  window.Badges.recordSession('mixed', 'timed');
  assert.equal(window.Badges.progress('all-rounder').current, 2);
  assert.equal(window.Badges.progress('all-rounder').target, 4);
});

test('a lower match target unlocks before all four units', () => {
  const { window } = setup();
  window.Badges.applyOverlay([{ id: 'match-pro', target: 2 }]);
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.isEarned('match-pro'), false);
  assert.equal(window.Badges.progress('match-pro').current, 1);
  const second = window.Badges.recordSession('unit2', 'match');
  assert.equal(window.Badges.isEarned('match-pro'), true);
  assert.equal(second.newBadges.some(b => b.id === 'match-pro'), true);
  assert.equal(window.Badges.progress('match-pro').target, 2);
  window.Badges.recordSession('unit3', 'match');
  window.Badges.recordSession('unit4', 'match');
  assert.equal(window.Badges.progress('match-pro').current, 2);
});

test('removing unit badges does not open the next unit early', () => {
  const { window } = setup();
  window.Badges.applyOverlay([{ id: 'unit-done:unit1', target: 1 }]);
  window.Badges.recordSession('unit1', 'fill', 'easy');
  assert.equal(window.Badges.catalog().some(b => String(b.id).indexOf('unit-done:') === 0), false);
  assert.equal(window.Badges.isEarned('unit-done:unit1'), false);
  assert.equal(window.Badges.coreComplete('unit1'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
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

test('an old boolean with no set list counts as one completed set', () => {
  const { window, localStorage } = setup();
  localStorage.setItem(window.Badges.KEY, JSON.stringify({
    earned: {},
    hadReview: {},
    units: {
      unit1: { match: true },
      unit2: { match: true },
      unit3: { lettersEasy: true, lettersEasyBest: 1 },
      unit4: { lettersHard: true, lettersHardBest: 1 },
      unit5: { grammarChat: true },
      unit6: { fillHard: true, fillHardBest: 0.95, lettersHard: true, lettersHardBest: 0.95 }
    }
  }));
  assert.equal(window.Badges.progress('match-pro').raw, 2);
  assert.equal(window.Badges.progress('letters-phrase').raw, 2);
  assert.equal(window.Badges.progress('grammar-chat').raw, 1);
  assert.equal(window.Badges.progress('hard-challenger').raw, 1);
  window.Badges.recordSession('unit1', 'match');
  assert.equal(window.Badges.progress('match-pro').raw, 2);
  window.Badges.recordSession('unit3', 'letters', 'easy', { correct: 4, total: 10 });
  assert.equal(window.Badges.progress('letters-phrase').raw, 2);
  const saved = JSON.parse(localStorage.getItem(window.Badges.KEY));
  assert.equal(saved.units.unit3.lettersEasyBest, 1);
  assert.equal(saved.units.unit3.sets.letters.unit3, 0.4);
});

test('chat practiser needs 3 different chat sets', () => {
  const { window } = setup();
  window.Badges.recordGrammarSession('unit1', 'chat', 1);
  window.Badges.recordGrammarSession('unit1', 'chat', 1);
  window.Badges.recordGrammarSession('unit1', 'chat', 2);
  assert.equal(window.Badges.progress('grammar-chat').raw, 2);
  assert.equal(window.Badges.isEarned('grammar-chat'), false);
  const third = window.Badges.recordGrammarSession('unit6', 'chat', 4);
  assert.equal(window.Badges.isEarned('grammar-chat'), true);
  assert.equal(third.newBadges.some(b => b.id === 'grammar-chat' && b.title === '對話練習生' && b.english === 'Chat Practiser'), true);
  assert.equal(window.Badges.recordGrammarSession('unit6', 'chat', 4).newBadges.some(b => b.id === 'grammar-chat'), false);
  assert.equal(window.Badges.unitUnlocked('unit2'), false);
});

test('grammar and a cleared boss unlock first steps', () => {
  const { window } = setup();
  const story = window.Badges.recordGrammarSession('unit6', 'join', 1);
  assert.equal(window.Badges.isEarned('starter'), true);
  assert.equal(story.newBadges.some(b => b.id === 'starter'), true);
  const bossOnly = setup();
  assert.equal(bossOnly.window.Badges.isEarned('starter'), false);
  assert.equal(bossOnly.window.Badges.recordGrammarBoss(0).newBadges.length, 0);
  const clear = bossOnly.window.Badges.recordGrammarBoss(1);
  assert.equal(bossOnly.window.Badges.isEarned('starter'), true);
  assert.equal(bossOnly.window.Badges.isEarned('grammar-boss'), true);
  assert.equal(clear.newBadges.some(b => b.id === 'starter'), true);
  const mystery = setup();
  mystery.window.Badges.recordGrammarInference();
  mystery.window.Badges.recordGrammarInference();
  mystery.window.Badges.recordGrammarInference();
  assert.equal(mystery.window.Badges.isEarned('grammar-inference'), true);
  assert.equal(mystery.window.Badges.isEarned('starter'), false);
});

test('all-rounder is earned in one book or in mixed topic', () => {
  const { window } = setup();
  window.Badges.recordSession('unit1', 'fill', 'hard');
  window.Badges.recordSession('unit2', 'letters', 'easy');
  window.Badges.recordSession('unit5', 'match');
  assert.equal(window.Badges.progress('all-rounder').raw, 3);
  assert.equal(window.Badges.isEarned('all-rounder'), false);
  window.Badges.recordSession('mixed', 'timed');
  assert.equal(window.Badges.progress('all-rounder').raw, 3);
  assert.equal(window.Badges.isEarned('all-rounder'), false);
  const earned = window.Badges.recordSession('unit6', 'timed');
  assert.equal(window.Badges.isEarned('all-rounder'), true);
  assert.equal(earned.newBadges.some(b => b.id === 'all-rounder'), true);
  const mixed = setup();
  mixed.window.Badges.recordSession('mixed', 'fill', 'easy');
  mixed.window.Badges.recordSession('mixed', 'letters', 'hard');
  mixed.window.Badges.recordSession('mixed', 'match');
  assert.equal(mixed.window.Badges.isEarned('all-rounder'), false);
  mixed.window.Badges.recordSession('mixed', 'timed');
  assert.equal(mixed.window.Badges.isEarned('all-rounder'), true);
});

test('dictation 3 is its own book and a future unit stays in the course book', () => {
  const { window } = setup();
  window.Badges.recordSession('dictation3', 'fill', 'easy');
  window.Badges.recordSession('dictation3', 'letters', 'hard');
  window.Badges.recordSession('dictation3', 'match');
  window.Badges.recordSession('unit1', 'timed');
  assert.equal(window.Badges.isEarned('all-rounder'), false);
  window.Badges.recordSession('dictation3', 'timed');
  assert.equal(window.Badges.isEarned('all-rounder'), true);
  const future = setup();
  future.window.Badges.recordSession('unit7', 'fill', 'easy');
  future.window.Badges.recordSession('unit1', 'letters', 'easy');
  future.window.Badges.recordSession('unit2', 'match');
  future.window.Badges.recordSession('unit3', 'timed');
  assert.equal(future.window.Badges.isEarned('all-rounder'), true);
  future.window.Badges.recordGrammarSession('unit7', 'chat', 1);
  future.window.Badges.recordGrammarSession('unit7', 'chat', 2);
  assert.equal(future.window.Badges.progress('grammar-chat').raw, 2);
  future.window.Badges.recordGrammarSession('unit8', 'chat', 1);
  assert.equal(future.window.Badges.isEarned('grammar-chat'), true);
  assert.equal(future.window.Badges.unitUnlocked('unit2'), false);
});

test('practice pages pass set ids and load the bumped badges script', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const fill = fs.readFileSync(path.join(root, 'practice/fill/index.html'), 'utf8');
  assert.match(fill, /recordSession\(unitId, 'fill', mode, \{ correct: correctCount, total: items\.length \}, setIndex \+ 1\)/);
  ['letters', 'match', 'timed'].forEach(name => {
    const html = fs.readFileSync(path.join(root, 'practice', name, 'index.html'), 'utf8');
    assert.match(html, /badges\.js\?v=5/);
    assert.doesNotMatch(html, /recordSession\([^)]*setIndex/);
  });
  const pages = [];
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
      if (entry.name === 'node_modules' || entry.name === '.git') return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(full);
    });
  }
  walk(root);
  const linked = pages.filter(file => fs.readFileSync(file, 'utf8').includes('badges.js'));
  assert.ok(linked.length >= 20);
  linked.forEach(file => {
    const html = fs.readFileSync(file, 'utf8');
    const refs = html.match(/[A-Za-z0-9_./-]*badges\.js(?:\?[^"']*)?/g) || [];
    assert.ok(refs.length > 0, path.relative(root, file));
    refs.forEach(ref => {
      assert.match(ref, /badges\.js\?v=5$/, path.relative(root, file) + ' ' + ref);
    });
  });
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
