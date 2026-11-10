/**
 * Mixed topic — same vocabulary as Unit 1–4.
 * Sentence Fill stems are new. Missing Letters, Match, and Timed
 * reuse those phrases, glosses, and word keys.
 */
window.PRACTICE_MIXED = {
  id: 'mixed',
  title: 'Mixed topic',
  words: [
    { key: 'unit1:elderly', form: 'verb', en: 'visit an elderly home', zh: '探訪安老院', img: '../unit1/thumb_10.png', audio: '../unit1/audio/audio_10.mp3' },
    { key: 'unit1:donate', form: 'verb', en: 'donate money', zh: '捐錢', img: '../unit1/thumb_06.png', audio: '../unit1/audio/audio_06.mp3' },
    { key: 'unit2:drought', form: 'noun', en: 'a drought', zh: '旱災', img: '../unit2/thumb_01.png', audio: '../unit2/audio/audio_01.mp3' },
    { key: 'unit2:flood', form: 'noun', en: 'a flood', zh: '水災', img: '../unit2/thumb_03.png', audio: '../unit2/audio/audio_03.mp3' },
    { key: 'unit3:mix', form: 'verb', en: 'mix', zh: '混合', img: '../unit3/thumb_03.png', audio: '../unit3/audio/audio_03.mp3' },
    { key: 'unit3:boil', form: 'verb', en: 'boil', zh: '煮沸', img: '../unit3/thumb_10.png', audio: '../unit3/audio/audio_10.mp3' },
    { key: 'unit4:comedy', form: 'noun', en: 'a comedy', zh: '喜劇', img: '../unit4/thumb_02.png', audio: '../unit4/audio/audio_02.mp3' },
    { key: 'unit4:fantasy', form: 'noun', en: 'a fantasy film', zh: '奇幻片', img: '../unit4/thumb_03.png', audio: '../unit4/audio/audio_03.mp3' },
    { key: 'unit4:lonely', form: 'adjective', en: 'lonely', zh: '寂寞的', img: '../unit4/thumb_09.png', audio: '../unit4/audio/audio_09.mp3' }
  ],

  fillIn: [
    {
      id: 'mx-f1',
      wordKey: 'unit1:elderly',
      sentence: 'On Sunday the scouts knock at the old people\'s residence and ______ with board games.',
      blank: '______',
      options: ['visit an elderly home', 'donate money', 'a comedy', 'boil'],
      answer: 'visit an elderly home',
      accept: ['visit an elderly home'],
      explain: 'Knocking at the residence where older people live means you visit an elderly home (探訪安老院).'
    },
    {
      id: 'mx-f2',
      wordKey: 'unit1:donate',
      sentence: 'Mum slides notes into the red tin by the supermarket checkout so she can ______ for the animal shelter.',
      blank: '______',
      options: ['donate money', 'visit an elderly home', 'mix', 'a flood'],
      answer: 'donate money',
      accept: ['donate money'],
      explain: 'Notes in the shelter tin means she will donate money (捐錢).'
    },
    {
      id: 'mx-f3',
      wordKey: 'unit2:drought',
      sentence: 'The reservoir behind the village is almost empty, which shows there has been ______.',
      blank: '______',
      options: ['a drought', 'a flood', 'a comedy', 'as busy as a bee'],
      answer: 'a drought',
      accept: ['a drought'],
      explain: 'An almost empty reservoir shows a drought (旱災), not extra water.'
    },
    {
      id: 'mx-f4',
      wordKey: 'unit2:flood',
      sentence: 'Brown water rushed through the market stalls and left the town in ______.',
      blank: '______',
      options: ['a flood', 'a drought', 'a fantasy film', 'lonely'],
      answer: 'a flood',
      accept: ['a flood'],
      explain: 'Water rushing through the stalls means a flood (水災).'
    },
    {
      id: 'mx-f5',
      wordKey: 'unit3:mix',
      sentence: 'The baker tips cocoa into the milk and must ______ them before the tray goes into the oven.',
      blank: '______',
      options: ['mix', 'boil', 'donate money', 'a comedy'],
      answer: 'mix',
      accept: ['mix'],
      explain: 'Cocoa and milk have to be joined together, so you mix (混合) them.'
    },
    {
      id: 'mx-f6',
      wordKey: 'unit3:boil',
      sentence: 'The kettle on the camp stove starts to ______ before we make tea.',
      blank: '______',
      options: ['boil', 'mix', 'a drought', 'visit an elderly home'],
      answer: 'boil',
      accept: ['boil'],
      explain: 'A kettle heating for tea will boil (煮沸).'
    },
    {
      id: 'mx-f7',
      wordKey: 'unit4:comedy',
      sentence: 'The cinema poster promised silly hats and loud laughter, so we bought tickets for ______.',
      blank: '______',
      options: ['a comedy', 'a fantasy film', 'a flood', 'as busy as a bee'],
      answer: 'a comedy',
      accept: ['a comedy'],
      explain: 'Silly hats and loud laughter point to a comedy (喜劇).'
    },
    {
      id: 'mx-f8',
      wordKey: 'unit4:fantasy',
      sentence: 'A glowing map and a flying horse open the story of ______.',
      blank: '______',
      options: ['a fantasy film', 'a comedy', 'lonely', 'boil'],
      answer: 'a fantasy film',
      accept: ['a fantasy film'],
      explain: 'A glowing map and a flying horse belong in a fantasy film (奇幻片).'
    },
    {
      id: 'mx-f9',
      wordKey: 'unit4:lonely',
      sentence: 'The new boy eats lunch by himself at the end of the bench and feels ______.',
      blank: '______',
      options: ['lonely', 'as busy as a bee', 'mix', 'a drought'],
      answer: 'lonely',
      accept: ['lonely'],
      explain: 'Eating alone at the end of the bench makes him feel lonely (寂寞的).'
    }
  ],

  fillInHard: [
    {
      id: 'mx-h1',
      wordKey: 'unit1:elderly',
      sentence: 'The residence which welcomes school visitors asked our scouts to ______ so that the grandparents are not left without company on Sunday.',
      blank: '______',
      answer: 'visit an elderly home',
      accept: ['visit an elderly home'],
      explain: 'Which names the residence, and the scouts visit an elderly home (探訪安老院) so the grandparents have company.'
    },
    {
      id: 'mx-h2',
      wordKey: 'unit1:donate',
      sentence: 'The tin which sits by the supermarket checkout is there so that shoppers can ______ for the animal shelter.',
      blank: '______',
      answer: 'donate money',
      accept: ['donate money'],
      explain: 'Which points to the tin, and shoppers donate money (捐錢) for the shelter.'
    },
    {
      id: 'mx-h3',
      wordKey: 'unit2:drought',
      sentence: 'If the reservoir which supplies the village stays empty, farmers who need water will face ______.',
      blank: '______',
      answer: 'a drought',
      accept: ['a drought'],
      explain: 'If the reservoir stays empty, the farmers face a drought (旱災).'
    },
    {
      id: 'mx-h4',
      wordKey: 'unit2:flood',
      sentence: 'Although the market stalls were tied down, brown water still caused ______ which closed the town for a day.',
      blank: '______',
      answer: 'a flood',
      accept: ['a flood'],
      explain: 'Although the stalls were tied down, the brown water was still a flood (水災).'
    },
    {
      id: 'mx-h5',
      wordKey: 'unit3:mix',
      sentence: 'When cocoa has been tipped into the milk, ______ them before the cake which is waiting goes into the oven.',
      blank: '______',
      answer: 'mix',
      accept: ['mix'],
      explain: 'When the cocoa is in the milk, you mix (混合) them before baking.'
    },
    {
      id: 'mx-h6',
      wordKey: 'unit3:boil',
      sentence: 'Before the campers make tea, they wait until the kettle on the stove starts to ______.',
      blank: '______',
      answer: 'boil',
      accept: ['boil'],
      explain: 'Before the tea, the kettle must boil (煮沸).'
    },
    {
      id: 'mx-h7',
      wordKey: 'unit4:comedy',
      sentence: 'Because the poster which we saw promised silly hats, we chose ______ rather than a frightening story.',
      blank: '______',
      answer: 'a comedy',
      accept: ['a comedy'],
      explain: 'Because the poster promised silly hats, the choice is a comedy (喜劇).'
    },
    {
      id: 'mx-h8',
      wordKey: 'unit4:fantasy',
      sentence: 'The story which begins with a glowing map and a flying horse belongs in ______.',
      blank: '______',
      answer: 'a fantasy film',
      accept: ['a fantasy film'],
      explain: 'Which begins with a glowing map and a flying horse, so it is a fantasy film (奇幻片).'
    },
    {
      id: 'mx-h9',
      wordKey: 'unit4:lonely',
      sentence: 'The boy who eats at the end of the bench, and who has just joined the class, feels ______ at lunch.',
      blank: '______',
      answer: 'lonely',
      accept: ['lonely'],
      explain: 'Who eats alone after just joining the class feels lonely (寂寞的).'
    }
  ],

  missingLetters: [
    { id: 'mx-m1', wordKey: 'unit1:elderly', word: 'visit an elderly home' },
    { id: 'mx-m2', wordKey: 'unit1:donate', word: 'donate money' },
    { id: 'mx-m3', wordKey: 'unit2:drought', word: 'a drought' },
    { id: 'mx-m4', wordKey: 'unit2:flood', word: 'a flood' },
    { id: 'mx-m5', wordKey: 'unit3:mix', word: 'mix' },
    { id: 'mx-m6', wordKey: 'unit3:boil', word: 'boil' },
    { id: 'mx-m7', wordKey: 'unit4:comedy', word: 'a comedy' },
    { id: 'mx-m8', wordKey: 'unit4:fantasy', word: 'a fantasy film' },
    { id: 'mx-m9', wordKey: 'unit4:lonely', word: 'lonely' }
  ],

  matching: [
    { id: 'mx-k1', wordKey: 'unit1:elderly', en: 'visit an elderly home', zh: '探訪安老院', form: 'verb', img: '../unit1/thumb_10.png' },
    { id: 'mx-k2', wordKey: 'unit1:donate', en: 'donate money', zh: '捐錢', form: 'verb', img: '../unit1/thumb_06.png' },
    { id: 'mx-k3', wordKey: 'unit2:drought', en: 'a drought', zh: '旱災', form: 'noun', img: '../unit2/thumb_01.png' },
    { id: 'mx-k4', wordKey: 'unit2:flood', en: 'a flood', zh: '水災', form: 'noun', img: '../unit2/thumb_03.png' },
    { id: 'mx-k5', wordKey: 'unit3:mix', en: 'mix', zh: '混合', form: 'verb', img: '../unit3/thumb_03.png' },
    { id: 'mx-k6', wordKey: 'unit3:boil', en: 'boil', zh: '煮沸', form: 'verb', img: '../unit3/thumb_10.png' },
    { id: 'mx-k7', wordKey: 'unit4:comedy', en: 'a comedy', zh: '喜劇', form: 'noun', img: '../unit4/thumb_02.png' },
    { id: 'mx-k8', wordKey: 'unit4:fantasy', en: 'a fantasy film', zh: '奇幻片', form: 'noun', img: '../unit4/thumb_03.png' },
    { id: 'mx-k9', wordKey: 'unit4:lonely', en: 'lonely', zh: '寂寞的', form: 'adjective', img: '../unit4/thumb_09.png' }
  ]
};
