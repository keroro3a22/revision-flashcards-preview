/**
 * Unit 3 · Junior Super Chef — practice data
 * Vocab from unit3/index.html CARDS
 */
window.PRACTICE_UNIT3 = {
  id: "unit3",
  title: "Unit 3 · Junior Super Chef",
  words: [
    { key: "unit3:beat", form: "verb", en: "beat", zh: "攪打", audio: "../unit3/audio/audio_01.mp3", img: "../unit3/thumb_01.jpg" },
    { key: "unit3:chop", form: "verb", en: "chop", zh: "切碎", audio: "../unit3/audio/audio_02.mp3", img: "../unit3/thumb_02.png" },
    { key: "unit3:mix", form: "verb", en: "mix", zh: "混合", audio: "../unit3/audio/audio_03.mp3", img: "../unit3/thumb_03.png" },
    { key: "unit3:pour", form: "verb", en: "pour", zh: "倒入", audio: "../unit3/audio/audio_04.mp3", img: "../unit3/thumb_04.jpg" },
    { key: "unit3:spread", form: "verb", en: "spread", zh: "塗抹", audio: "../unit3/audio/audio_05.mp3", img: "../unit3/thumb_05.jpg?v=2" },
    { key: "unit3:sprinkle", form: "verb", en: "sprinkle", zh: "灑上", audio: "../unit3/audio/audio_06.mp3", img: "../unit3/thumb_06.jpg" },
    { key: "unit3:stir", form: "verb", en: "stir", zh: "攪拌", audio: "../unit3/audio/audio_07.mp3", img: "../unit3/thumb_07.jpg" },
    { key: "unit3:peel", form: "verb", en: "peel", zh: "削皮", audio: "../unit3/audio/audio_08.mp3", img: "../unit3/thumb_08.png" },
    { key: "unit3:bake", form: "verb", en: "bake", zh: "烘烤", audio: "../unit3/audio/audio_09.mp3", img: "../unit3/thumb_09.jpg" },
    { key: "unit3:boil", form: "verb", en: "boil", zh: "煮沸", audio: "../unit3/audio/audio_10.mp3", img: "../unit3/thumb_10.png" },
    { key: "unit3:fry", form: "verb", en: "fry", zh: "煎／炒", audio: "../unit3/audio/audio_11.mp3", img: "../unit3/thumb_11.png" },
    { key: "unit3:steam", form: "verb", en: "steam", zh: "蒸", audio: "../unit3/audio/audio_12.mp3", img: "../unit3/thumb_12.jpg" },
  ],

  fillIn: [
    {
      id: "u3-f1",
      wordKey: "unit3:beat",
      sentence: "First ______ the eggs with a whisk until they look light and foamy.",
      blank: '______',
      options: ["beat", "chop", "peel", "bake"],
      answer: "beat",
      accept: ["beat"],
      explain: "A whisk makes eggs light and foamy \u2014 that is to beat (\u652a\u6253)."
    },
    {
      id: "u3-f2",
      wordKey: "unit3:chop",
      sentence: "Please ______ the onions with a knife into small pieces for the salad.",
      blank: '______',
      options: ["chop", "beat", "pour", "bake"],
      answer: "chop",
      accept: ["chop"],
      explain: "Cutting into small pieces with a knife = chop (\u5207\u788e)."
    },
    {
      id: "u3-f3",
      wordKey: "unit3:mix",
      sentence: "______ the flour and sugar together in a bowl until they are evenly combined.",
      blank: '______',
      options: ["mix", "fry", "steam", "peel"],
      answer: "mix",
      accept: ["mix"],
      explain: "Combining dry ingredients evenly = mix (\u6df7\u5408)."
    },
    {
      id: "u3-f4",
      wordKey: "unit3:pour",
      sentence: "Slowly ______ the milk from the jug into the pan so it does not splash.",
      blank: '______',
      options: ["pour", "chop", "bake", "peel"],
      answer: "pour",
      accept: ["pour"],
      explain: "Liquid from a jug into a pan = pour (\u5012\u5165)."
    },
    {
      id: "u3-f5",
      wordKey: "unit3:spread",
      sentence: "______ a thin layer of butter on the warm toast with a knife.",
      blank: '______',
      options: ["spread", "boil", "steam", "chop"],
      answer: "spread",
      accept: ["spread"],
      explain: "A thin layer of butter on toast = spread (\u5857\u62b9)."
    },
    {
      id: "u3-f6",
      wordKey: "unit3:sprinkle",
      sentence: "______ a little grated cheese lightly on top of the hot pizza.",
      blank: '______',
      options: ["sprinkle", "boil", "fry", "peel"],
      answer: "sprinkle",
      accept: ["sprinkle"],
      explain: "Lightly scattering cheese on top = sprinkle (\u7051\u4e0a)."
    },
    {
      id: "u3-f7",
      wordKey: "unit3:stir",
      sentence: "______ the soup with a spoon so it does not stick to the bottom of the pot.",
      blank: '______',
      options: ["stir", "bake", "peel", "fry"],
      answer: "stir",
      accept: ["stir"],
      explain: "Moving soup with a spoon so it does not stick = stir (\u652a\u62cc)."
    },
    {
      id: "u3-f8",
      wordKey: "unit3:peel",
      sentence: "______ the apple with a peeler so that no skin is left before you cut it.",
      blank: '______',
      options: ["peel", "beat", "fry", "steam"],
      answer: "peel",
      accept: ["peel"],
      explain: "Taking the skin off fruit = peel (\u524a\u76ae)."
    },
    {
      id: "u3-f9",
      wordKey: "unit3:bake",
      sentence: "We ______ the cake in a hot oven until it turns golden brown.",
      blank: '______',
      options: ["bake", "chop", "pour", "stir"],
      answer: "bake",
      accept: ["bake"],
      explain: "Cooking in a hot oven = bake (\u70d8\u70e4)."
    },
    {
      id: "u3-f10",
      wordKey: "unit3:boil",
      sentence: "______ the water in the pot until big bubbles appear, then add the noodles.",
      blank: '______',
      options: ["boil", "spread", "sprinkle", "chop"],
      answer: "boil",
      accept: ["boil"],
      explain: "Water with big bubbles = boil (\u716e\u6cb8)."
    },
    {
      id: "u3-f11",
      wordKey: "unit3:fry",
      sentence: "Mum will ______ the eggs in a little hot oil in the pan until the edges are crispy.",
      blank: '______',
      options: ["fry", "steam", "peel", "mix"],
      answer: "fry",
      accept: ["fry"],
      explain: "Cooking in hot oil in a pan = fry (\u714e\uff0f\u7092)."
    },
    {
      id: "u3-f12",
      wordKey: "unit3:steam",
      sentence: "We ______ the fish over hot water in a steamer so it stays soft and juicy.",
      blank: '______',
      options: ["steam", "fry", "chop", "beat"],
      answer: "steam",
      accept: ["steam"],
      explain: "Cooking over hot water in a steamer = steam (\u84b8)."
    }
  ],

  fillInHard: [
    {
      id: "u3-h1",
      wordKey: "unit3:beat",
      sentence: "Before you add the flour, ______ the eggs with a whisk so that the cake rises well and looks foamy.",
      blank: '______',
      answer: "beat",
      accept: ["beat"],
      explain: "Whisking eggs until foamy = beat (\u652a\u6253)."
    },
    {
      id: "u3-h2",
      wordKey: "unit3:chop",
      sentence: "After you wash the vegetables, ______ them with a knife so that they cook faster in small pieces.",
      blank: '______',
      answer: "chop",
      accept: ["chop"],
      explain: "Knife into small pieces = chop (\u5207\u788e)."
    },
    {
      id: "u3-h3",
      wordKey: "unit3:mix",
      sentence: "When the flour and cocoa are in the bowl, ______ them until they are evenly blended.",
      blank: '______',
      answer: "mix",
      accept: ["mix"],
      explain: "Flour and cocoa blended evenly, with no whisk, means mix (\u6df7\u5408)."
    },
    {
      id: "u3-h4",
      wordKey: "unit3:pour",
      sentence: "After the sauce thickens, carefully ______ it from the jug over the pasta so that every strand is covered.",
      blank: '______',
      answer: "pour",
      accept: ["pour"],
      explain: "Liquid from a jug over food = pour (\u5012\u5165)."
    },
    {
      id: "u3-h5",
      wordKey: "unit3:spread",
      sentence: "Before you toast the bread, ______ a thin layer of jam on it with a knife so that it tastes sweet.",
      blank: '______',
      answer: "spread",
      accept: ["spread"],
      explain: "A layer of jam with a knife = spread (\u5857\u62b9)."
    },
    {
      id: "u3-h6",
      wordKey: "unit3:sprinkle",
      sentence: "When the pizza is on the plate, ______ grated cheese by scattering it lightly on top so that it melts nicely.",
      blank: '______',
      answer: "sprinkle",
      accept: ["sprinkle"],
      explain: "Lightly scattering cheese = sprinkle (\u7051\u4e0a)."
    },
    {
      id: "u3-h7",
      wordKey: "unit3:stir",
      sentence: "While the soup is hot, ______ it gently with a spoon so that nothing sticks to the bottom.",
      blank: '______',
      answer: "stir",
      accept: ["stir"],
      explain: "Spoon motion so soup does not stick = stir (\u652a\u62cc)."
    },
    {
      id: "u3-h8",
      wordKey: "unit3:peel",
      sentence: "Before you slice the fruit, ______ it with a peeler so that no skin is left on the plate.",
      blank: '______',
      answer: "peel",
      accept: ["peel"],
      explain: "Removing fruit skin = peel (\u524a\u76ae)."
    },
    {
      id: "u3-h9",
      wordKey: "unit3:bake",
      sentence: "After you prepare the dough, ______ the cookies in the oven so that they turn golden brown.",
      blank: '______',
      answer: "bake",
      accept: ["bake"],
      explain: "Cookies in the oven = bake (\u70d8\u70e4)."
    },
    {
      id: "u3-h10",
      wordKey: "unit3:boil",
      sentence: "Before you cook the noodles, ______ the water until big bubbles appear so that they soften quickly.",
      blank: '______',
      answer: "boil",
      accept: ["boil"],
      explain: "Water with big bubbles = boil (\u716e\u6cb8)."
    },
    {
      id: "u3-h11",
      wordKey: "unit3:fry",
      sentence: "When the oil in the pan is hot, ______ the eggs so that the edges become crispy.",
      blank: '______',
      answer: "fry",
      accept: ["fry"],
      explain: "Eggs in hot oil = fry (\u714e\uff0f\u7092)."
    },
    {
      id: "u3-h12",
      wordKey: "unit3:steam",
      sentence: "After you season the fish, ______ it over hot water in a steamer so that it stays soft and juicy.",
      blank: '______',
      answer: "steam",
      accept: ["steam"],
      explain: "Fish over hot water = steam (\u84b8)."
    }
  ],

  missingLetters: [
    { id: "u3-m1", wordKey: "unit3:beat", word: "beat", audio: "../unit3/audio/audio_01.mp3" },
    { id: "u3-m2", wordKey: "unit3:chop", word: "chop", audio: "../unit3/audio/audio_02.mp3" },
    { id: "u3-m3", wordKey: "unit3:mix", word: "mix", audio: "../unit3/audio/audio_03.mp3" },
    { id: "u3-m4", wordKey: "unit3:pour", word: "pour", audio: "../unit3/audio/audio_04.mp3" },
    { id: "u3-m5", wordKey: "unit3:spread", word: "spread", audio: "../unit3/audio/audio_05.mp3" },
    { id: "u3-m6", wordKey: "unit3:sprinkle", word: "sprinkle", audio: "../unit3/audio/audio_06.mp3" },
    { id: "u3-m7", wordKey: "unit3:stir", word: "stir", audio: "../unit3/audio/audio_07.mp3" },
    { id: "u3-m8", wordKey: "unit3:peel", word: "peel", audio: "../unit3/audio/audio_08.mp3" },
    { id: "u3-m9", wordKey: "unit3:bake", word: "bake", audio: "../unit3/audio/audio_09.mp3" },
    { id: "u3-m10", wordKey: "unit3:boil", word: "boil", audio: "../unit3/audio/audio_10.mp3" },
    { id: "u3-m11", wordKey: "unit3:fry", word: "fry", audio: "../unit3/audio/audio_11.mp3" },
    { id: "u3-m12", wordKey: "unit3:steam", word: "steam", audio: "../unit3/audio/audio_12.mp3" },
  ],

  matching: [
    { id: "u3-k1", wordKey: "unit3:beat", en: "beat", zh: "攪打", img: "../unit3/thumb_01.jpg" },
    { id: "u3-k2", wordKey: "unit3:chop", en: "chop", zh: "切碎", img: "../unit3/thumb_02.png" },
    { id: "u3-k3", wordKey: "unit3:mix", en: "mix", zh: "混合", img: "../unit3/thumb_03.png" },
    { id: "u3-k4", wordKey: "unit3:pour", en: "pour", zh: "倒入", img: "../unit3/thumb_04.jpg" },
    { id: "u3-k5", wordKey: "unit3:spread", en: "spread", zh: "塗抹", img: "../unit3/thumb_05.jpg?v=2" },
    { id: "u3-k6", wordKey: "unit3:sprinkle", en: "sprinkle", zh: "灑上", img: "../unit3/thumb_06.jpg" },
    { id: "u3-k7", wordKey: "unit3:stir", en: "stir", zh: "攪拌", img: "../unit3/thumb_07.jpg" },
    { id: "u3-k8", wordKey: "unit3:peel", en: "peel", zh: "削皮", img: "../unit3/thumb_08.png" },
    { id: "u3-k9", wordKey: "unit3:bake", en: "bake", zh: "烘烤", img: "../unit3/thumb_09.jpg" },
    { id: "u3-k10", wordKey: "unit3:boil", en: "boil", zh: "煮沸", img: "../unit3/thumb_10.png" },
    { id: "u3-k11", wordKey: "unit3:fry", en: "fry", zh: "煎／炒", img: "../unit3/thumb_11.png" },
    { id: "u3-k12", wordKey: "unit3:steam", en: "steam", zh: "蒸", img: "../unit3/thumb_12.jpg" },
  ]
};
