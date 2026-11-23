const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ClueHunt = require('../game/clue-hunt-state.js');

const root = path.join(__dirname, '..');

function solved() {
  return {
    time: 'About 1:20',
    who: 'Amy',
    why: 'To pick a ticket in secret and win the new bike'
  };
}

test('six hotspots and only Ken is misleading', () => {
  assert.equal(ClueHunt.HOTSPOTS.length, 6);
  assert.deepEqual(ClueHunt.HOTSPOTS.map((spot) => spot.id), ['stall', 'wheel', 'film', 'hall', 'desk', 'store']);
  assert.deepEqual(ClueHunt.HOTSPOTS.map((spot) => spot.kind), ['search', 'talk', 'talk', 'search', 'talk', 'talk']);
  const misleading = ClueHunt.HOTSPOTS.filter((spot) => spot.misleading);
  assert.equal(misleading.length, 1);
  assert.equal(misleading[0].id, 'store');
  assert.equal(misleading[0].cardText, 'Ken says he saw Leo go into the storeroom at noon.');
  const byId = Object.fromEntries(ClueHunt.HOTSPOTS.map((spot) => [spot.id, spot]));
  assert.equal(byId.stall.cardText, 'An unsigned note says: Please move the raffle box to the hall. Thanks!');
  assert.doesNotMatch(byId.stall.cardText, /apple/i);
  assert.doesNotMatch(byId.stall.cardText, /Amy/);
  assert.match(byId.wheel.cardText, /About 1:15/);
  assert.match(byId.wheel.cardText, /blue jacket/);
  assert.match(byId.wheel.cardText, /new bike/);
  assert.doesNotMatch(byId.wheel.cardText, /Amy/);
  assert.doesNotMatch(byId.film.cardText, /apple/i);
  assert.match(byId.film.cardText, /new bike/);
  assert.match(byId.film.cardText, /would not have to wait for the bus/);
  assert.doesNotMatch(byId.film.cardText, /memo/);
  assert.match(byId.film.cardText, /left in her blue jacket just after lunch/);
  assert.doesNotMatch(byId.film.cardText, /raffle|Leo|1:15|took the box/);
  assert.match(byId.hall.cardText, /About 1:20/);
  assert.match(byId.hall.cardText, /raffle box was backstage/);
  assert.match(byId.hall.cardText, /tickets were sticking out/);
  assert.doesNotMatch(byId.hall.cardText, /apple|Leo|Win bike|waiting/i);
  assert.doesNotMatch(byId.hall.cardText, /Amy/);
  assert.equal(byId.desk.id, 'desk');
  assert.equal(byId.desk.name, 'Staff Room');
  assert.equal(byId.desk.cardTitle, 'Staff Room');
  assert.equal(byId.desk.cardText, 'Miss Chan did not ask Sam, or anyone else, to move the raffle box.');
  assert.match(byId.desk.prompts[1].reply, /I have been in the classroom/);
  assert.equal(byId.stall.name, 'Charity stall');
  assert.equal(byId.stall.cardTitle, 'Charity stall');
  assert.match(byId.wheel.cardText, /Sam had left earlier with a big box/);
  assert.doesNotMatch(byId.wheel.cardText, /Amy/);
  assert.doesNotMatch(byId.desk.cardText, /Amy/);
  assert.equal(byId.store.art, 'illust/scene-storeroom-ken.jpg');
  assert.equal(byId.store.marker, '../practice/grammar/illust/u1_07_books.jpg');
  const src = fs.readFileSync(path.join(root, 'game/clue-hunt-state.js'), 'utf8');
  assert.doesNotMatch(src, /Who is missing/);
  assert.doesNotMatch(src, /A comedy ___/);
  assert.equal(ClueHunt.PRACTICE, undefined);
});

test('talk follow-ups stay on the case and Ken’s noon line stays', () => {
  const byId = Object.fromEntries(ClueHunt.HOTSPOTS.map((spot) => [spot.id, spot]));
  const store = byId.store.prompts;
  assert.equal(store[0].label, 'What time did you see Leo?');
  assert.equal(store[0].reply, 'I saw Leo go into the storeroom at noon.');
  assert.equal(store[0].useful, true);
  assert.equal(store[1].label, 'Who took the box?');
  assert.match(store[1].reply, /Sam brought old books/);
  assert.match(store[1].reply, /I also saw Leo/);
  assert.doesNotMatch(store[1].reply, /not sure|only remember|Amy/i);
  assert.equal(store[2].label, 'Why are you in the storeroom?');
  assert.match(store[2].reply, /old books Sam brought/);
  assert.doesNotMatch(store.map((item) => item.label + item.reply).join(' '), /Where is the school hall|across the fair/i);
  const who = ClueHunt.visit(ClueHunt.createHunt(), 'store', 'who');
  assert.equal(who.added, false);
  assert.equal(who.reply, store[1].reply);
  assert.equal(byId.film.prompts[1].reply, 'I did not see her write a note. We were talking about her wish list and the new bike.');
  const noonTalk = ClueHunt.visit(ClueHunt.createHunt(), 'store', 'noon');
  assert.equal(noonTalk.reply, 'I saw Leo go into the storeroom at noon.');
  assert.equal(noonTalk.card.text, 'Ken says he saw Leo go into the storeroom at noon.');
  const chan = ClueHunt.visit(ClueHunt.createHunt(), 'desk', 'move');
  assert.equal(chan.reply, 'I did not ask Sam, or anyone else, to move the raffle box.');
  assert.equal(chan.card.text, 'Miss Chan did not ask Sam, or anyone else, to move the raffle box.');
  assert.equal(byId.wheel.prompts[1].reply, 'Yes. I wanted the new bike too, but I stayed here at the wheel.');
  assert.match(byId.desk.prompts[2].reply, /handwriting/);
  assert.doesNotMatch(byId.desk.prompts[2].reply, /Amy/);
  assert.match(byId.wheel.prompts[2].reply, /not at noon/);
});

test('each hotspot has one useful action and a useless stall tap adds nothing', () => {
  ClueHunt.HOTSPOTS.forEach((spot) => {
    const actions = spot.kind === 'search' ? spot.spots : spot.prompts;
    assert.equal(actions.length, 3);
    assert.equal(actions.filter((item) => item.useful).length, 1);
  });
  const missed = ClueHunt.visit(ClueHunt.createHunt(), 'stall', 'flags');
  assert.equal(missed.added, false);
  assert.equal(missed.duplicate, false);
  assert.equal(missed.card, null);
  assert.equal(missed.reply, 'This is the donation box. It is not the raffle box.');
  assert.deepEqual(missed.state.order, []);
  assert.equal(ClueHunt.visit.length, 3);
});

test('a useful visit adds one card and does not mutate the previous state', () => {
  const start = ClueHunt.createHunt();
  const found = ClueHunt.visit(start, 'stall', 'memo');
  assert.deepEqual(start.order, []);
  assert.equal(found.added, true);
  assert.equal(found.duplicate, false);
  assert.match(found.reply, /unsigned note/);
  assert.doesNotMatch(found.reply, /apple/i);
  assert.deepEqual(ClueHunt.notebook(found.state).map((card) => card.id), ['stall']);
});

test('revisiting a hotspot does not duplicate its card', () => {
  const once = ClueHunt.visit(ClueHunt.createHunt(), 'hall', 'box');
  const twice = ClueHunt.visit(once.state, 'hall', 'box');
  const aside = ClueHunt.visit(once.state, 'hall', 'seats');
  assert.equal(twice.added, false);
  assert.equal(twice.duplicate, true);
  assert.equal(twice.state.order.length, 1);
  assert.equal(aside.added, false);
  assert.equal(aside.state.order.length, 1);
  assert.match(ClueHunt.notebook(twice.state)[0].text, /About 1:20/);
  assert.doesNotMatch(ClueHunt.notebook(twice.state)[0].text, /apple|Leo|Win bike/i);
});

test('solve stays locked until all six cards exist, in any order', () => {
  let state = ClueHunt.createHunt();
  const steps = [['desk', 'move'], ['store', 'noon'], ['hall', 'box'], ['stall', 'memo'], ['wheel', 'jacket'], ['film', 'lunch']];
  steps.forEach((pair, index) => {
    state = ClueHunt.visit(state, pair[0], pair[1]).state;
    assert.equal(ClueHunt.solveUnlocked(state), index === 5);
  });
  assert.deepEqual(ClueHunt.notebook(state).map((card) => card.id), ['desk', 'store', 'hall', 'stall', 'wheel', 'film']);
});

test('the notebook view of Ken’s card is unlabeled', () => {
  const state = ClueHunt.visit(ClueHunt.createHunt(), 'store', 'noon').state;
  const view = ClueHunt.displayCard(ClueHunt.notebook(state)[0]);
  assert.deepEqual(view, {
    title: 'Storeroom',
    text: 'Ken says he saw Leo go into the storeroom at noon.'
  });
  assert.equal(Object.prototype.hasOwnProperty.call(view, 'misleading'), false);
  assert.doesNotMatch(view.title + view.text, /false|wrong/i);
});

test('solve asks who, why, and about 1:20, with no grammar blank', () => {
  assert.deepEqual(Object.keys(ClueHunt.CASE), ['who', 'why', 'time']);
  assert.equal(ClueHunt.CASE.who.answer, 'Amy');
  assert.deepEqual(ClueHunt.CASE.who.options, ['Amy', 'Sam', 'May', 'Ken']);
  assert.equal(ClueHunt.CASE.why.answer, 'To pick a ticket in secret and win the new bike');
  assert.equal(ClueHunt.CASE.time.prompt, 'About what time did the box arrive backstage?');
  assert.equal(ClueHunt.CASE.time.answer, 'About 1:20');
  assert.deepEqual(ClueHunt.CASE.time.options, ['About 1:20', 'At noon', 'At 11:30', 'About 2:00']);
  assert.equal(ClueHunt.CASE.where, undefined);
  const joined = JSON.stringify(ClueHunt.CASE);
  assert.doesNotMatch(joined, /Who is missing/);
  assert.doesNotMatch(joined, /A comedy ___/);
});

test('a wrong time hints a card and hides the ending', () => {
  const noon = ClueHunt.submitSolve({ time: 'At noon', who: 'Amy', why: 'To pick a ticket in secret and win the new bike' });
  const other = ClueHunt.submitSolve({ time: 'At 11:30', who: 'Amy', why: 'To pick a ticket in secret and win the new bike' });
  assert.deepEqual(noon, { ok: false, hint: 'Read the storeroom card again.', ending: '' });
  assert.equal(other.hint, 'Read the school hall card again.');
  assert.doesNotMatch(noon.hint + other.hint, /Amy/);
});

test('a wrong who or why names a card and does not reveal the ending', () => {
  const whoOnly = ClueHunt.submitSolve({ time: 'About 1:20', who: 'Ken', why: 'To pick a ticket in secret and win the new bike' });
  const whyOnly = ClueHunt.submitSolve({ time: 'About 1:20', who: 'Amy', why: 'To hide the box in the storeroom' });
  const both = ClueHunt.submitSolve({ time: 'About 1:20', who: 'Sam', why: 'To give the tickets to the film club' });
  assert.equal(whoOnly.ok, false);
  assert.equal(whoOnly.ending, '');
  assert.equal(whoOnly.hint, 'Read the film club card again.');
  assert.equal(whyOnly.hint, 'Read the prize wheel card again.');
  assert.equal(both.hint, 'Read the film club card and the prize wheel card again.');
  assert.doesNotMatch(whoOnly.hint + whyOnly.hint + both.hint, /Amy/);
});

test('the correct who, why, and time return the one ending', () => {
  const result = ClueHunt.submitSolve(solved());
  assert.equal(result.ok, true);
  assert.equal(result.hint, '');
  assert.equal(result.ending, ClueHunt.ENDING);
  assert.match(result.ending, /Amy brought the tickets back and said sorry/);
  assert.match(result.ending, /He is safe/);
  assert.match(result.ending, /Sam had only carried old books/);
  assert.match(result.ending, /May had stayed at the prize wheel/);
  assert.match(result.ending, /She was the student in the blue jacket/);
  assert.doesNotMatch(result.ending, /film club took/);
});
