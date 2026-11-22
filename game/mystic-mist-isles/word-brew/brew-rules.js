(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WordBrew = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var NEED = 4;
  var REMINDER = "You don’t have to use all the letters each time.";

  /* Strong language is not counted as a real word on this school page. */
  var BLOCK = {
    anal: 1, anus: 1, arse: 1, arses: 1, ass: 1, asses: 1, bastard: 1,
    bitch: 1, bitches: 1, boob: 1, boobs: 1, cock: 1, cocks: 1, crap: 1,
    cum: 1, cunt: 1, damn: 1, dick: 1, dicks: 1, dildo: 1, dyke: 1, fag: 1,
    faggot: 1, fuck: 1, fucked: 1, fucker: 1, fucking: 1, goddamn: 1, hell: 1,
    homo: 1, horny: 1, jizz: 1, nazi: 1, nazis: 1, nude: 1, nudes: 1, penis: 1,
    piss: 1, porn: 1, pussy: 1, rape: 1, raped: 1, sex: 1, sexy: 1, shit: 1,
    shits: 1, slut: 1, sluts: 1, tit: 1, tits: 1, twat: 1, wank: 1, whore: 1
  };

  var POTIONS = [
    {
      id: 'garden',
      name: 'Little Garden Potion',
      theme: 'Words about a garden',
      instruction: 'Make 4 words about what you can see in a garden to finish the Little Garden Potion.',
      letters: 'enabte',
      targets: ['ant', 'bee', 'bean', 'beet'],
      clues: {
        ant: 'A very small insect that walks in a line.',
        bee: 'A yellow and black insect that makes honey.',
        bean: 'A small seed that we can eat.',
        beet: 'A dark red vegetable that grows in the ground.'
      },
      bonuses: [],
      effect: 'The potion is ready. A small leaf appears on the table, then fades. For a short time, the room feels quiet and safe, as if a tiny garden has grown around you.'
    },
    {
      id: 'water',
      name: 'Calm Water Potion',
      theme: 'Words about water',
      instruction: 'Make 4 words about water you can see or feel to finish the Calm Water Potion.',
      letters: 'wnitaer',
      targets: ['rain', 'wet', 'water', 'tear'],
      clues: {
        rain: 'Water that falls from the sky.',
        wet: 'How you feel when water is on you.',
        water: 'What we drink, and what is in a river or the sea.',
        tear: 'A drop of water from your eye.'
      },
      bonuses: [],
      effect: 'The potion is ready. A small ripple moves across the table, then fades. For a short time, the room feels cool and calm, as if you are sitting by still water.'
    },
    {
      id: 'light',
      name: 'Soft Light Potion',
      theme: 'Words about light',
      instruction: 'Make 4 words about light from the sky, and whether a place is bright or dark, to finish the Soft Light Potion.',
      letters: 'tlnuis',
      targets: ['sun', 'lit', 'unlit', 'sunlit'],
      clues: {
        sun: 'The bright light in the sky in the daytime.',
        lit: 'A place has light. It is not dark.',
        unlit: 'A place has no light. It is dark.',
        sunlit: 'A place is bright because the sun is shining on it.'
      },
      bonuses: [],
      effect: 'The potion is ready. A soft glow comes from the bottle, then fades. For a short time, the room feels warm and gentle, as if morning light has come in.'
    },
    {
      id: 'room',
      name: 'Cozy Room Potion',
      theme: 'Words about a room',
      instruction: 'Make 4 words about rooms, and what you can see in them to finish the Cozy Room Potion.',
      letters: 'rmboedo',
      targets: ['bed', 'door', 'room', 'dorm'],
      clues: {
        bed: 'You sleep on this at night.',
        door: 'You open this to go in or out.',
        room: 'A space in a house or school.',
        dorm: 'A room at school where a few people sleep.'
      },
      bonuses: ['bedroom'],
      effect: 'The potion is ready. The bottle feels warm for a moment, then fades. For a short time, the room feels tidy and comfortable, as if it has just been made ready for you.'
    },
    {
      id: 'friends',
      name: 'Little Friends Potion',
      theme: 'Words about animals',
      instruction: 'Make 4 words about animals that can be little friends to finish the Little Friends Potion.',
      letters: 'tgdaco',
      targets: ['cat', 'dog', 'goat', 'toad'],
      clues: {
        cat: 'A small pet that says meow.',
        dog: 'A pet that can bark and wag its tail.',
        goat: 'A farm animal with horns that eats grass.',
        toad: 'A small animal like a frog that lives on land.'
      },
      bonuses: ['cod'],
      effect: 'The potion is ready. A tiny paw print appears on the table, then fades. For a short time, you hear a soft, friendly sound nearby, then it is gone.'
    }
  ];

  function lettersOnly(value) {
    return String(value || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function counts(text) {
    var map = {};
    var s = lettersOnly(text);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      map[ch] = (map[ch] || 0) + 1;
    }
    return map;
  }

  function canSpell(word, letters) {
    var need = counts(word);
    var have = counts(letters);
    var keys = Object.keys(need);
    if (!keys.length) return false;
    for (var i = 0; i < keys.length; i++) {
      if ((have[keys[i]] || 0) < need[keys[i]]) return false;
    }
    return true;
  }

  function blankState() {
    return { found: [], extras: [], bonuses: [] };
  }

  function copyState(state) {
    state = state || {};
    return {
      found: (state.found || []).slice(),
      extras: (state.extras || []).slice(),
      bonuses: (state.bonuses || []).slice()
    };
  }

  function matchTarget(word, targets) {
    if (targets.indexOf(word) !== -1) return word;
    if (word.length > 3 && word.charAt(word.length - 1) === 's') {
      var base = word.slice(0, -1);
      if (targets.indexOf(base) !== -1) return base;
    }
    return '';
  }

  function hasWord(line, words) {
    for (var i = 0; i < words.length; i++) {
      if (words[i] && line.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function fisher(source) {
    var arr = source.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /* The row of tiles must not read as a hidden word. */
  function shuffleLetters(letters, banned) {
    var tiles = lettersOnly(letters).split('');
    var words = (banned || []).map(lettersOnly).filter(Boolean);
    var order = tiles.slice();
    var i;
    for (i = 0; i < 80; i++) {
      order = fisher(tiles);
      if (!hasWord(order.join(''), words)) return order;
    }
    order = tiles.slice();
    for (i = 0; i < order.length * order.length; i++) {
      if (!hasWord(order.join(''), words)) return order;
      var a = i % order.length;
      var b = (i + 1 + Math.floor(i / order.length)) % order.length;
      var tmp = order[a];
      order[a] = order[b];
      order[b] = tmp;
    }
    return order;
  }

  function dictionary(words) {
    var set = new Set();
    (words || []).forEach(function (word) {
      var w = lettersOnly(word);
      if (/^[a-z]{3,7}$/.test(w) && !BLOCK[w]) set.add(w);
    });
    return {
      has: function (word) {
        return set.has(lettersOnly(word));
      }
    };
  }

  function judge(potion, raw, state, dict) {
    var word = lettersOnly(raw);
    var next = copyState(state);
    if (word.length < 3 || !canSpell(word, potion.letters)) {
      return { type: 'invalid', word: word, state: next };
    }
    var target = matchTarget(word, potion.targets);
    if (target) {
      if (next.found.indexOf(target) !== -1) {
        return { type: 'repeat', word: word, target: target, state: next };
      }
      next.found.push(target);
      return {
        type: 'target',
        word: word,
        target: target,
        state: next,
        done: next.found.length >= NEED
      };
    }
    if (potion.bonuses.indexOf(word) !== -1) {
      if (next.bonuses.indexOf(word) !== -1) {
        return { type: 'repeat-bonus', word: word, state: next };
      }
      next.bonuses.push(word);
      return { type: 'bonus', word: word, state: next };
    }
    if (!dict || !dict.has(word)) {
      return { type: 'invalid', word: word, state: next };
    }
    if (next.extras.indexOf(word) !== -1) {
      return { type: 'repeat-extra', word: word, state: next };
    }
    next.extras.push(word);
    return { type: 'extra', word: word, state: next };
  }

  return {
    NEED: NEED,
    REMINDER: REMINDER,
    POTIONS: POTIONS,
    blankState: blankState,
    dictionary: dictionary,
    canSpell: canSpell,
    shuffleLetters: shuffleLetters,
    judge: judge
  };
});
