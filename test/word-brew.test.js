const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Brew = require('../game/mystic-mist-isles/word-brew/brew-rules.js');

function potion(id) {
  return Brew.POTIONS.find((item) => item.id === id);
}

test('five potions keep the garden, water, light, room, and animal rounds', () => {
  assert.equal(Brew.POTIONS.map((item) => item.id).join(','), 'garden,water,light,room,friends');
  assert.equal(Brew.NEED, 4);
  assert.equal(Brew.REMINDER, 'You don’t have to use all the letters each time.');
  assert.equal(potion('garden').instruction, 'Make 4 words about what you can see in a garden to finish the Little Garden Potion.');
  assert.equal(potion('water').instruction, 'Make 4 words about water you can see or feel to finish the Calm Water Potion.');
  assert.equal(potion('light').instruction, 'Make 4 words about light from the sky, and whether a place is bright or dark, to finish the Soft Light Potion.');
  assert.equal(potion('room').instruction, 'Make 4 words about rooms, and what you can see in them to finish the Cozy Room Potion.');
  assert.equal(potion('friends').instruction, 'Make 4 words about animals that can be little friends to finish the Little Friends Potion.');
  Brew.POTIONS.forEach((item) => {
    assert.equal(item.targets.length, 4);
    assert.match(item.instruction, /Make 4 words/);
    assert.match(item.effect, /^The potion is ready\./);
    item.targets.forEach((word) => assert.equal(Brew.canSpell(word, item.letters), true));
    item.bonuses.forEach((word) => assert.equal(Brew.canSpell(word, item.letters), true));
  });
  assert.equal(potion('garden').clues.ant, 'A very small insect that walks in a line.');
  assert.equal(potion('garden').clues.bee, 'A yellow and black insect that makes honey.');
  assert.equal(potion('garden').clues.bean, 'A small seed that we can eat.');
  assert.equal(potion('garden').clues.beet, 'A dark red vegetable that grows in the ground.');
  assert.equal(potion('water').clues.rain, 'Water that falls from the sky.');
  assert.equal(potion('water').clues.wet, 'How you feel when water is on you.');
  assert.equal(potion('water').clues.water, 'What we drink, and what is in a river or the sea.');
  assert.equal(potion('water').clues.tear, 'A drop of water from your eye.');
  assert.equal(potion('light').clues.sun, 'The bright light in the sky in the daytime.');
  assert.equal(potion('light').clues.lit, 'A place has light. It is not dark.');
  assert.equal(potion('light').clues.unlit, 'A place has no light. It is dark.');
  assert.equal(potion('light').clues.sunlit, 'A place is bright because the sun is shining on it.');
  assert.equal(potion('room').clues.bed, 'You sleep on this at night.');
  assert.equal(potion('room').clues.door, 'You open this to go in or out.');
  assert.equal(potion('room').clues.room, 'A space in a house or school.');
  assert.equal(potion('room').clues.dorm, 'A room at school where a few people sleep.');
  assert.equal(potion('friends').clues.cat, 'A small pet that says meow.');
  assert.equal(potion('friends').clues.dog, 'A pet that can bark and wag its tail.');
  assert.equal(potion('friends').clues.goat, 'A farm animal with horns that eats grass.');
  assert.equal(potion('friends').clues.toad, 'A small animal like a frog that lives on land.');
  assert.equal(potion('room').clues.bedroom, undefined);
  assert.equal(potion('friends').clues.cod, undefined);
  assert.deepEqual(potion('room').bonuses, ['bedroom']);
  assert.deepEqual(potion('friends').bonuses, ['cod']);
  assert.equal(potion('garden').bonuses.length, 0);
});

test('a shuffled row does not spell a hidden word', () => {
  Brew.POTIONS.forEach((item) => {
    const banned = item.targets.concat(item.bonuses);
    for (let n = 0; n < 20; n++) {
      const row = Brew.shuffleLetters(item.letters, banned).join('');
      assert.equal(row.length, item.letters.length);
      banned.forEach((word) => assert.equal(row.includes(word), false, row + ' contains ' + word));
    }
  });
});

test('targets pour once, plurals count as the same target, and bonuses do not', () => {
  const dict = Brew.dictionary(['tea', 'eat', 'eaten', 'slut', 'lust', 'write', 'broom', 'coat']);
  const garden = potion('garden');
  const start = Brew.blankState();
  const bee = Brew.judge(garden, 'BEE', start, dict);
  assert.equal(bee.type, 'target');
  assert.equal(bee.state.found.join(','), 'bee');
  assert.deepEqual(start.found, []);
  const light = potion('light');
  const lit = Brew.judge(light, 'lit', Brew.blankState(), dict);
  assert.equal(lit.type, 'target');
  const again = Brew.judge(light, 'lits', lit.state, dict);
  assert.equal(again.type, 'repeat');
  assert.equal(again.target, 'lit');
  const lits = Brew.judge(light, 'lits', Brew.blankState(), dict);
  assert.equal(lits.type, 'target');
  assert.equal(lits.target, 'lit');
  const room = potion('room');
  const bonus = Brew.judge(room, 'bedroom', Brew.blankState(), dict);
  assert.equal(bonus.type, 'bonus');
  assert.deepEqual(bonus.state.found, []);
  assert.deepEqual(bonus.state.bonuses, ['bedroom']);
  const bed = Brew.judge(room, 'bed', bonus.state, dict);
  assert.equal(bed.type, 'target');
  assert.equal(bed.state.found.join(','), 'bed');
  const friends = potion('friends');
  const cod = Brew.judge(friends, 'cod', Brew.blankState(), dict);
  assert.equal(cod.type, 'bonus');
  assert.deepEqual(cod.state.found, []);
});

test('other real words are kept nearby and invalid words are not', () => {
  const dict = Brew.dictionary(['tea', 'eat', 'slut', 'lust']);
  const garden = potion('garden');
  const tea = Brew.judge(garden, 'tea', Brew.blankState(), dict);
  assert.equal(tea.type, 'extra');
  assert.deepEqual(tea.state.found, []);
  assert.deepEqual(tea.state.extras, ['tea']);
  const same = Brew.judge(garden, 'tea', tea.state, dict);
  assert.equal(same.type, 'repeat-extra');
  assert.deepEqual(same.state.extras, ['tea']);
  const blocked = Brew.judge(potion('light'), 'slut', Brew.blankState(), dict);
  assert.equal(blocked.type, 'invalid');
  assert.deepEqual(blocked.state.extras, []);
  assert.equal(dict.has('slut'), false);
  assert.equal(dict.has('lust'), true);
  const short = Brew.judge(garden, 'be', Brew.blankState(), dict);
  assert.equal(short.type, 'invalid');
  const extraLetter = Brew.judge(garden, 'beets', Brew.blankState(), dict);
  assert.equal(extraLetter.type, 'invalid');
  const madeUp = Brew.judge(garden, 'zzzz', Brew.blankState(), dict);
  assert.equal(madeUp.type, 'invalid');
});

test('four different targets finish the potion', () => {
  const dict = Brew.dictionary([]);
  let state = Brew.blankState();
  let done = false;
  potion('friends').targets.forEach((word) => {
    const result = Brew.judge(potion('friends'), word, state, dict);
    state = result.state;
    done = !!result.done;
  });
  assert.equal(done, true);
  assert.equal(state.found.length, 4);
  const cod = Brew.judge(potion('friends'), 'cod', state, dict);
  assert.equal(cod.type, 'bonus');
  assert.equal(cod.state.found.length, 4);
});

test('the bundled word list is local and includes the potion words', () => {
  const file = fs.readFileSync(path.join(__dirname, '../game/mystic-mist-isles/word-brew/words.txt'), 'utf8');
  const words = new Set(file.split('\n').filter((line) => /^[a-z]{3,7}$/.test(line)));
  assert.ok(words.size > 20000);
  ['ant', 'bee', 'bean', 'beet', 'rain', 'water', 'sunlit', 'unlit', 'bedroom', 'toad', 'cod', 'eaten', 'broom'].forEach((word) => {
    assert.equal(words.has(word), true, word);
  });
  assert.equal(words.has('slut'), false);
  assert.doesNotMatch(file, /https?:\/\//);
});

test('the hint control is the practice lightbulb beside the letter tiles', () => {
  const html = fs.readFileSync(path.join(__dirname, '../game/mystic-mist-isles/word-brew/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../game/mystic-mist-isles/word-brew/brew.css'), 'utf8');
  const tiles = html.slice(html.indexOf('class="tile-row"'), html.indexOf('class="actions"'));
  assert.match(tiles, /id="tiles"/);
  assert.match(tiles, /id="hint-word"/);
  assert.match(tiles, /aria-label="Hint"/);
  assert.doesNotMatch(tiles, />Hint</);
  const found = html.slice(html.indexOf('id="found-words"'), html.indexOf('class="remind-space"'));
  assert.doesNotMatch(found, /hint-word/);
  const actions = html.slice(html.indexOf('class="actions"'), html.indexOf('class="clue"'));
  assert.doesNotMatch(actions, /hint-word|>Hint</);
  assert.match(css, /harder-badge\.png/);
  assert.match(css, /#play\.is-done #hint-word/);
  assert.doesNotMatch(css, /\.found-row/);
});
