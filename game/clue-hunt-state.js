(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ClueHunt = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ENDING = "Amy opened the raffle box backstage to pick a ticket for the new bike. She was the student in the blue jacket. Leo was waiting there the whole time. He is safe. Sam had only carried old books, and May had stayed at the prize wheel. Amy brought the tickets back and said sorry. The charity stall can use the tickets again.";

  var HOTSPOTS = [
    {
      id: "stall",
      name: "Charity stall",
      kind: "search",
      marker: "../practice/grammar/illust/u1_s4_carnival_stalls.jpg",
      art: "illust/scene-stall-unsigned.jpg",
      intro: "Look at the charity stall table.",
      cardTitle: "Charity stall",
      cardText: "An unsigned note says: Please move the raffle box to the hall. Thanks!",
      misleading: false,
      spots: [
        { id: "memo", label: "Unsigned note", useful: true, hits: [{ x: "47%", y: "70%", art: "illust/zoom-unsigned-note.jpg" }], reply: "An unsigned note says: Please move the raffle box to the hall. Thanks!" },
        { id: "flags", label: "Where the box was", useful: false, hits: [{ x: "64%", y: "70%", art: "illust/zoom-empty.png" }], reply: "The raffle box is not here. Only the note is left on the table." },
        { id: "books", label: "Stall awning", useful: false, hits: [{ x: "50%", y: "11%", art: "illust/zoom-awning.jpg" }], reply: "The awning is just the colourful roof. Nothing is written on it." }
      ]
    },
    {
      id: "wheel",
      name: "Prize wheel",
      kind: "talk",
      marker: "../practice/grammar/illust/u1_s4_lucky_draw.jpg",
      art: "illust/scene-prize-wheel-fair.jpg",
      intro: "May is watching the prize wheel.",
      mark: { x: "38%", y: "46%" },
      cardTitle: "Prize wheel",
      cardText: "About 1:15, someone in a blue jacket left the stall with Leo. Sam had left earlier with a big box. He said it was the raffle box. The big prize is a new bike.",
      misleading: false,
      prompts: [
        { id: "jacket", label: "Who left with Leo?", useful: true, reply: "About 1:15, I saw someone in a blue jacket leave the stall with Leo. Before that, Sam left with a big box. He said it was the raffle box. The big prize is a new bike." },
        { id: "lucky", label: "Did you want the bike?", useful: false, reply: "Yes. I wanted the new bike too, but I stayed here at the wheel." },
        { id: "noon", label: "Was that at noon?", useful: false, reply: "I saw them after lunch, not at noon." }
      ]
    },
    {
      id: "film",
      name: "Film club",
      kind: "talk",
      marker: "../practice/grammar/illust/u4_s5_studio_lights.jpg",
      art: "illust/scene-film-sticker.jpg",
      intro: "Zoe is here with the film club.",
      mark: { x: "52%", y: "48%" },
      cardTitle: "Film club",
      cardText: "Amy left in her blue jacket just after lunch, and she came back later. She wished for the new bike. She said if she won the bike, she would not have to wait for the bus.",
      misleading: false,
      prompts: [
        { id: "lunch", label: "What did Amy do after lunch?", useful: true, reply: "She left in her blue jacket just after lunch, and she came back later. She wished for the new bike. She said if she won it, she would not have to wait for the bus." },
        { id: "note", label: "Did Amy write a note?", useful: false, reply: "I did not see her write a note. We were talking about her wish list and the new bike." },
        { id: "box", label: "Did you see the raffle box?", useful: false, reply: "No. We were filming in this room. I did not see the raffle box." }
      ]
    },
    {
      id: "hall",
      name: "School hall",
      kind: "search",
      marker: "../practice/grammar/illust/u4_s4_musical_finale.jpg",
      art: "illust/scene-hall-open-box.jpg",
      intro: "Look around backstage.",
      cardTitle: "School hall",
      cardText: "About 1:20 the raffle box was backstage. It was open, and some tickets were sticking out.",
      misleading: false,
      spots: [
        { id: "box", label: "Raffle box", useful: true, hits: [{ x: "48%", y: "50%", title: "Raffle box", art: "illust/zoom-raffle-box.jpg" }], reply: "About 1:20 the raffle box was backstage. It was open, and some tickets were sticking out." },
        { id: "curtain", label: "Stage curtain", useful: false, hits: [{ x: "24%", y: "34%", art: "illust/zoom-curtain.jpg" }], reply: "The red curtains are tied back. Nothing is hidden behind them." },
        { id: "seats", label: "Empty seats", useful: false, hits: [{ x: "22%", y: "82%", art: "illust/zoom-seats.jpg" }], reply: "The seats are empty. Nobody left a bag or a note." }
      ]
    },
    {
      id: "desk",
      name: "Staff Room",
      kind: "talk",
      marker: "illust/miss-chan-desk.png",
      art: "illust/scene-miss-chan-class.jpg",
      intro: "Miss Chan is at her desk.",
      mark: { x: "54%", y: "48%" },
      cardTitle: "Staff Room",
      cardText: "Miss Chan did not ask Sam, or anyone else, to move the raffle box.",
      misleading: false,
      prompts: [
        { id: "move", label: "Did you ask anyone to move the box?", useful: true, reply: "I did not ask Sam, or anyone else, to move the raffle box." },
        { id: "leo", label: "Where is Leo?", useful: false, reply: "I have not seen Leo since this morning. I have been in the classroom." },
        { id: "note", label: "Who wrote the note?", useful: false, reply: "I did not write it. I do not know the handwriting." }
      ]
    },
    {
      id: "store",
      name: "Storeroom",
      kind: "talk",
      marker: "../practice/grammar/illust/u1_07_books.jpg",
      art: "illust/scene-storeroom-ken.jpg",
      intro: "Ken is in the storeroom with the books.",
      mark: { x: "68%", y: "48%" },
      cardTitle: "Storeroom",
      cardText: "Ken says he saw Leo go into the storeroom at noon.",
      misleading: true,
      prompts: [
        { id: "noon", label: "What time did you see Leo?", useful: true, reply: "I saw Leo go into the storeroom at noon." },
        { id: "who", label: "Who took the box?", useful: false, reply: "I did not see who took the raffle box. Sam brought old books, and I also saw Leo." },
        { id: "books", label: "Why are you in the storeroom?", useful: false, reply: "I am sorting the old books Sam brought for Miss Chan. I did not see the raffle box in here." }
      ]
    }
  ];

  var CASE = {
    who: {
      prompt: "Who took the box?",
      options: ["Amy", "Sam", "May", "Ken"],
      answer: "Amy"
    },
    why: {
      prompt: "Why?",
      options: [
        "To pick a ticket in secret and win the new bike",
        "To help Miss Chan move the box",
        "To hide the box in the storeroom",
        "To give the tickets to the film club"
      ],
      answer: "To pick a ticket in secret and win the new bike"
    },
    time: {
      prompt: "About what time did the box arrive backstage?",
      options: ["About 1:20", "At noon", "At 11:30", "About 2:00"],
      answer: "About 1:20"
    }
  };

  function findHotspot(hotspotId) {
    for (var i = 0; i < HOTSPOTS.length; i++) {
      if (HOTSPOTS[i].id === hotspotId) return HOTSPOTS[i];
    }
    return null;
  }

  function findAction(hotspot, actionId) {
    var list = hotspot.kind === "search" ? hotspot.spots : hotspot.prompts;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === actionId) return list[i];
    }
    return null;
  }

  var YOU_FACT = "You are a Primary 6 student. You are looking into what happened to the raffle box.";

  var PEOPLE = [
    { id: "you", name: "You", art: "illust/people/you.png", head: "illust/people/heads/you.png", speakerFor: null },
    { id: "may", name: "May", art: "illust/people/may.png", head: "illust/people/heads/may.png", speakerFor: "wheel" },
    { id: "zoe", name: "Zoe", art: "illust/people/zoe.png", head: "illust/people/heads/zoe.png", speakerFor: "film" },
    { id: "miss-chan", name: "Miss Chan", art: "illust/people/miss-chan.png", head: "illust/people/heads/miss-chan.png", speakerFor: "desk" },
    { id: "ken", name: "Ken", art: "illust/people/ken.png", head: "illust/people/heads/ken.png", speakerFor: "store" },
    { id: "leo", name: "Leo", art: "illust/people/leo.png", head: "illust/people/heads/leo.png", speakerFor: null },
    { id: "sam", name: "Sam", art: "illust/people/sam.png", head: "illust/people/heads/sam.png", speakerFor: null }
  ];

  function firstSentence(text) {
    var match = String(text).match(/[^.!?]*[.!?]/);
    return match ? match[0].trim() : String(text).trim();
  }

  function sentenceWith(text, name) {
    var parts = String(text).split(/(?<=[.!?])\s+/);
    var pattern = new RegExp("\\b" + name + "\\b");
    for (var i = 0; i < parts.length; i++) {
      if (pattern.test(parts[i])) return parts[i].trim();
    }
    return firstSentence(text);
  }

  function speakerId(hotspotId) {
    for (var i = 0; i < PEOPLE.length; i++) {
      if (PEOPLE[i].speakerFor === hotspotId) return PEOPLE[i].id;
    }
    return null;
  }

  function personById(id) {
    for (var i = 0; i < PEOPLE.length; i++) {
      if (PEOPLE[i].id === id) return PEOPLE[i];
    }
    return null;
  }

  function withPerson(state, id, fact) {
    if (state.people[id]) return state;
    var people = Object.assign({}, state.people);
    people[id] = { fact: fact };
    return { found: state.found, order: state.order, people: people };
  }

  function unlockFromTalk(state, hotspot, reply) {
    var next = state;
    var speaker = speakerId(hotspot.id);
    if (speaker) next = withPerson(next, speaker, firstSentence(reply));
    if (/\bLeo\b/.test(reply)) next = withPerson(next, "leo", sentenceWith(reply, "Leo"));
    if (/\bSam\b/.test(reply)) next = withPerson(next, "sam", sentenceWith(reply, "Sam"));
    return next;
  }

  function peopleAlbum(state) {
    return PEOPLE.filter(function (person) {
      return state.people[person.id];
    }).map(function (person) {
      return { id: person.id, name: person.name, art: person.art, head: person.head, fact: state.people[person.id].fact };
    });
  }

  function personFact(state, id) {
    return state.people[id] ? state.people[id].fact : "";
  }

  function createHunt() {
    return { found: {}, order: [], people: { you: { fact: YOU_FACT } } };
  }

  function visit(state, hotspotId, actionId) {
    var hotspot = findHotspot(hotspotId);
    if (!hotspot) {
      return { state: state, added: false, duplicate: false, reply: "That place is not on the map.", card: null };
    }
    var action = findAction(hotspot, actionId);
    if (!action) {
      return { state: state, added: false, duplicate: false, reply: "Try another spot.", card: null };
    }
    if (hotspot.kind === "talk") state = unlockFromTalk(state, hotspot, action.reply);
    if (!action.useful) {
      return { state: state, added: false, duplicate: false, reply: action.reply, card: null };
    }
    if (state.found[hotspot.id]) {
      return { state: state, added: false, duplicate: true, reply: action.reply, card: state.found[hotspot.id] };
    }
    var card = {
      id: hotspot.id,
      title: hotspot.cardTitle,
      text: hotspot.cardText,
      misleading: hotspot.misleading
    };
    var found = Object.assign({}, state.found);
    found[hotspot.id] = card;
    var next = { found: found, order: state.order.concat([hotspot.id]), people: state.people };
    return { state: next, added: true, duplicate: false, reply: action.reply, card: card };
  }

  function notebook(state) {
    return state.order.map(function (id) { return state.found[id]; });
  }

  function solveUnlocked(state) {
    return state.order.length === 6;
  }

  function displayCard(card) {
    return { title: card.title, text: card.text };
  }

  function timeHint(time) {
    if (time === "At noon") return "Read the storeroom card again.";
    return "Read the school hall card again.";
  }

  function caseHint(picks) {
    var whoOk = picks.who === CASE.who.answer;
    var whyOk = picks.why === CASE.why.answer;
    if (!whoOk && !whyOk) return "Read the film club card and the prize wheel card again.";
    if (!whoOk) return "Read the film club card again.";
    return "Read the prize wheel card again.";
  }

  function submitSolve(picks) {
    var chosen = picks || {};
    if (chosen.time !== CASE.time.answer) {
      return { ok: false, hint: timeHint(chosen.time), ending: "" };
    }
    if (chosen.who !== CASE.who.answer || chosen.why !== CASE.why.answer) {
      return { ok: false, hint: caseHint(chosen), ending: "" };
    }
    return { ok: true, hint: "", ending: ENDING };
  }

  return {
    HOTSPOTS: HOTSPOTS,
    CASE: CASE,
    ENDING: ENDING,
    YOU_FACT: YOU_FACT,
    PEOPLE: PEOPLE,
    speakerId: speakerId,
    personById: personById,
    peopleAlbum: peopleAlbum,
    personFact: personFact,
    createHunt: createHunt,
    visit: visit,
    notebook: notebook,
    solveUnlocked: solveUnlocked,
    displayCard: displayCard,
    submitSolve: submitSolve
  };
});
