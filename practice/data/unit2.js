/**
 * Unit 2 · Lend a helping hand — practice data
 * Vocab from unit2/index.html CARDS
 */
window.PRACTICE_UNIT2 = {
  id: "unit2",
  title: "Unit 2 · Lend a helping hand",
  words: [
    { key: "unit2:drought", form: "noun", en: "a drought", zh: "旱災", audio: "../unit2/audio/audio_01.mp3", img: "../unit2/thumb_01.jpg?v=4" },
    { key: "unit2:earthquake", form: "noun", en: "an earthquake", zh: "地震", audio: "../unit2/audio/audio_02.mp3", img: "../unit2/thumb_02.jpg?v=4" },
    { key: "unit2:flood", form: "noun", en: "a flood", zh: "水災", audio: "../unit2/audio/audio_03.mp3", img: "../unit2/thumb_03.png" },
    { key: "unit2:landslip", form: "noun", en: "a landslip", zh: "山泥傾瀉", audio: "../unit2/audio/audio_04.mp3", img: "../unit2/thumb_04.jpg?v=4" },
    { key: "unit2:tsunami", form: "noun", en: "a tsunami", zh: "海嘯", audio: "../unit2/audio/audio_05.mp3", img: "../unit2/thumb_05.jpg?v=4" },
    { key: "unit2:typhoon", form: "noun", en: "a typhoon", zh: "颱風", audio: "../unit2/audio/audio_06.mp3", img: "../unit2/thumb_06.jpg" },
    { key: "unit2:block", form: "verb", en: "block roads", zh: "堵塞道路", audio: "../unit2/audio/audio_07.mp3", img: "../unit2/thumb_07.png" },
    { key: "unit2:damage", form: "verb", en: "damage crops", zh: "損毀農作物", audio: "../unit2/audio/audio_08.mp3", img: "../unit2/thumb_08.png" },
    { key: "unit2:destroy", form: "verb", en: "destroy buildings", zh: "摧毀建築物", audio: "../unit2/audio/audio_09.mp3", img: "../unit2/thumb_09.jpg?v=4" },
    { key: "unit2:injure", form: "verb", en: "injure people", zh: "使人受傷", audio: "../unit2/audio/audio_10.mp3", img: "../unit2/thumb_10.png" },
  ],

  fillIn: [
    {
      id: "u2-f1",
      wordKey: "unit2:drought",
      sentence: "There was no rain for six months, so the farmers worried about ______ drying up their fields.",
      blank: '______',
      options: ["a drought", "an earthquake", "a flood", "a landslip"],
      answer: "a drought",
      accept: ["a drought"],
      explain: "No rain for months = a drought (\u65f1\u707d). Floods have too much water, not too little."
    },
    {
      id: "u2-f2",
      wordKey: "unit2:earthquake",
      sentence: "Cups rattled and the ground shook for almost a minute during ______ under the city.",
      blank: '______',
      options: ["an earthquake", "a drought", "a flood", "a typhoon"],
      answer: "an earthquake",
      accept: ["an earthquake"],
      explain: "When the ground shakes, it is an earthquake (\u5730\u9707)."
    },
    {
      id: "u2-f3",
      wordKey: "unit2:flood",
      sentence: "After days of heavy rain, river water covered the streets and caused ______ in the village.",
      blank: '______',
      options: ["a flood", "a drought", "an earthquake", "a landslip"],
      answer: "a flood",
      accept: ["a flood"],
      explain: "Streets covered by river water = a flood (\u6c34\u707d)."
    },
    {
      id: "u2-f4",
      wordKey: "unit2:landslip",
      sentence: "After the heavy rain, wet soil slid down the steep hillside and caused ______ onto the road.",
      blank: '______',
      options: ["a landslip", "a drought", "a tsunami", "a typhoon"],
      answer: "a landslip",
      accept: ["a landslip"],
      explain: "Soil sliding down a hillside = a landslip (\u5c71\u6ce5\u50be\u7009)."
    },
    {
      id: "u2-f5",
      wordKey: "unit2:tsunami",
      sentence: "After the seaquake, huge ocean waves rushed onto the beach during ______.",
      blank: '______',
      options: ["a tsunami", "a drought", "a typhoon", "a landslip"],
      answer: "a tsunami",
      accept: ["a tsunami"],
      explain: "Huge ocean waves after a seaquake = a tsunami (\u6d77\u562f)."
    },
    {
      id: "u2-f6",
      wordKey: "unit2:typhoon",
      sentence: "Schools in Hong Kong close and Signal 8 is raised when there is ______ with very strong wind.",
      blank: '______',
      options: ["a typhoon", "a drought", "an earthquake", "a landslip"],
      answer: "a typhoon",
      accept: ["a typhoon"],
      explain: "Signal 8 and strong wind mean a typhoon (\u98b1\u98a8)."
    },
    {
      id: "u2-f7",
      wordKey: "unit2:block",
      sentence: "Fallen trees lie across the street and ______ so cars and ambulances cannot pass.",
      blank: '______',
      options: ["block roads", "damage crops", "destroy buildings", "injure people"],
      answer: "block roads",
      accept: ["block roads"],
      explain: "Trees across the street stop traffic \u2014 they block roads (\u5835\u585e\u9053\u8def)."
    },
    {
      id: "u2-f8",
      wordKey: "unit2:damage",
      sentence: "Strong winds flatten the rice in the fields and ______ before harvest time.",
      blank: '______',
      options: ["damage crops", "block roads", "destroy buildings", "injure people"],
      answer: "damage crops",
      accept: ["damage crops"],
      explain: "Flattened rice in fields = damage crops (\u640d\u6bc0\u8fb2\u4f5c\u7269)."
    },
    {
      id: "u2-f9",
      wordKey: "unit2:destroy",
      sentence: "The powerful quake made walls fall and can ______ so families lose their homes.",
      blank: '______',
      options: ["destroy buildings", "block roads", "damage crops", "injure people"],
      answer: "destroy buildings",
      accept: ["destroy buildings"],
      explain: "Walls falling and lost homes = destroy buildings (\u6467\u6bc0\u5efa\u7bc9\u7269)."
    },
    {
      id: "u2-f10",
      wordKey: "unit2:injure",
      sentence: "Sharp broken glass from windows can cut arms and legs and ______ in an accident.",
      blank: '______',
      options: ["injure people", "block roads", "damage crops", "destroy buildings"],
      answer: "injure people",
      accept: ["injure people"],
      explain: "Cutting arms and legs means you injure people (\u4f7f\u4eba\u53d7\u50b7)."
    }
  ],

  fillInHard: [
    {
      id: "u2-h1",
      wordKey: "unit2:drought",
      sentence: "If there is so little rain for months, farmers who grow rice will face ______ so that their fields crack and dry up.",
      blank: '______',
      answer: "a drought",
      accept: ["a drought"],
      explain: "Months with almost no rain = a drought (\u65f1\u707d)."
    },
    {
      id: "u2-h2",
      wordKey: "unit2:earthquake",
      sentence: "If the ground shakes so much that cups fall, people who live in tall flats must leave quickly during ______.",
      blank: '______',
      answer: "an earthquake",
      accept: ["an earthquake"],
      explain: "Shaking ground = an earthquake (\u5730\u9707)."
    },
    {
      id: "u2-h3",
      wordKey: "unit2:flood",
      sentence: "Although sandbags are ready, so much rain can still cause ______ which covers the low streets with river water.",
      blank: '______',
      answer: "a flood",
      accept: ["a flood"],
      explain: "Streets covered by rainwater = a flood (\u6c34\u707d)."
    },
    {
      id: "u2-h4",
      wordKey: "unit2:landslip",
      sentence: "If the soil becomes so soft after heavy rain, a hillside which is steep may send mud down in ______.",
      blank: '______',
      answer: "a landslip",
      accept: ["a landslip"],
      explain: "Mud sliding from a hillside = a landslip (\u5c71\u6ce5\u50be\u7009)."
    },
    {
      id: "u2-h5",
      wordKey: "unit2:tsunami",
      sentence: "Although warning sirens ring, so many coastal towns which sit by the sea can still be hit by ______ with giant waves.",
      blank: '______',
      answer: "a tsunami",
      accept: ["a tsunami"],
      explain: "Giant sea waves hitting the coast = a tsunami (\u6d77\u562f)."
    },
    {
      id: "u2-h6",
      wordKey: "unit2:typhoon",
      sentence: "If the wind becomes so strong that Signal 8 is raised, schools which have outdoor PE will close because of ______.",
      blank: '______',
      answer: "a typhoon",
      accept: ["a typhoon"],
      explain: "Signal 8 + strong wind = a typhoon (\u98b1\u98a8)."
    },
    {
      id: "u2-h7",
      wordKey: "unit2:block",
      sentence: "Fallen trees which lie across the street can ______ so that ambulances cannot pass to the hospital.",
      blank: '______',
      answer: "block roads",
      accept: ["block roads"],
      explain: "Trees across the street block roads (\u5835\u585e\u9053\u8def)."
    },
    {
      id: "u2-h8",
      wordKey: "unit2:damage",
      sentence: "Strong winds which last for days may ______ in the fields so that farmers lose so much food before harvest.",
      blank: '______',
      answer: "damage crops",
      accept: ["damage crops"],
      explain: "Winds hurting plants in fields = damage crops (\u640d\u6bc0\u8fb2\u4f5c\u7269)."
    },
    {
      id: "u2-h9",
      wordKey: "unit2:destroy",
      sentence: "If the quake is so powerful, it can ______ which people need for shelter, leaving walls in ruins.",
      blank: '______',
      answer: "destroy buildings",
      accept: ["destroy buildings"],
      explain: "Ruined walls and lost shelter = destroy buildings (\u6467\u6bc0\u5efa\u7bc9\u7269)."
    },
    {
      id: "u2-h10",
      wordKey: "unit2:injure",
      sentence: "Broken glass which falls from windows can ______ so that helpers must move carefully and bring bandages.",
      blank: '______',
      answer: "injure people",
      accept: ["injure people"],
      explain: "Glass that cuts people = injure people (\u4f7f\u4eba\u53d7\u50b7)."
    }
  ],

  missingLetters: [
    { id: "u2-m1", wordKey: "unit2:drought", word: "a drought", audio: "../unit2/audio/audio_01.mp3" },
    { id: "u2-m2", wordKey: "unit2:earthquake", word: "an earthquake", audio: "../unit2/audio/audio_02.mp3" },
    { id: "u2-m3", wordKey: "unit2:flood", word: "a flood", audio: "../unit2/audio/audio_03.mp3" },
    { id: "u2-m4", wordKey: "unit2:landslip", word: "a landslip", audio: "../unit2/audio/audio_04.mp3" },
    { id: "u2-m5", wordKey: "unit2:tsunami", word: "a tsunami", audio: "../unit2/audio/audio_05.mp3" },
    { id: "u2-m6", wordKey: "unit2:typhoon", word: "a typhoon", audio: "../unit2/audio/audio_06.mp3" },
    { id: "u2-m7", wordKey: "unit2:block", word: "block roads", audio: "../unit2/audio/audio_07.mp3" },
    { id: "u2-m8", wordKey: "unit2:damage", word: "damage crops", audio: "../unit2/audio/audio_08.mp3" },
    { id: "u2-m9", wordKey: "unit2:destroy", word: "destroy buildings", audio: "../unit2/audio/audio_09.mp3" },
    { id: "u2-m10", wordKey: "unit2:injure", word: "injure people", audio: "../unit2/audio/audio_10.mp3" },
  ],

  matching: [
    { id: "u2-k1", wordKey: "unit2:drought", en: "a drought", zh: "旱災", img: "../unit2/thumb_01.jpg?v=4" },
    { id: "u2-k2", wordKey: "unit2:earthquake", en: "an earthquake", zh: "地震", img: "../unit2/thumb_02.jpg?v=4" },
    { id: "u2-k3", wordKey: "unit2:flood", en: "a flood", zh: "水災", img: "../unit2/thumb_03.png" },
    { id: "u2-k4", wordKey: "unit2:landslip", en: "a landslip", zh: "山泥傾瀉", img: "../unit2/thumb_04.jpg?v=4" },
    { id: "u2-k5", wordKey: "unit2:tsunami", en: "a tsunami", zh: "海嘯", img: "../unit2/thumb_05.jpg?v=4" },
    { id: "u2-k6", wordKey: "unit2:typhoon", en: "a typhoon", zh: "颱風", img: "../unit2/thumb_06.jpg" },
    { id: "u2-k7", wordKey: "unit2:block", en: "block roads", zh: "堵塞道路", img: "../unit2/thumb_07.png" },
    { id: "u2-k8", wordKey: "unit2:damage", en: "damage crops", zh: "損毀農作物", img: "../unit2/thumb_08.png" },
    { id: "u2-k9", wordKey: "unit2:destroy", en: "destroy buildings", zh: "摧毀建築物", img: "../unit2/thumb_09.jpg?v=4" },
    { id: "u2-k10", wordKey: "unit2:injure", en: "injure people", zh: "使人受傷", img: "../unit2/thumb_10.png" },
  ]
};
