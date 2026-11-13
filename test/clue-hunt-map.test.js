const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function huntHtml() {
  return fs.readFileSync(path.join(root, 'game/clue-hunt/index.html'), 'utf8');
}

test('intro leads to a six-stop paper map before any quiz', () => {
  const html = huntHtml();
  const intro = html.slice(html.indexOf('id="intro"'), html.indexOf('id="fair-map"'));
  assert.match(intro, />The case</);
  assert.match(intro, />How to play</);
  assert.match(intro, /id="you-intro"/);
  assert.match(intro, /You are a Primary 6 student\. You are looking into what happened to the raffle box\./);
  assert.doesNotMatch(intro, /case-you/);
  assert.doesNotMatch(intro, /illust\/people\/you\.png/);
  assert.doesNotMatch(intro, /person-avatar/);
  assert.doesNotMatch(html, /Look around the school fair/);
  assert.match(html, /id="step-label" hidden/);
  assert.match(intro, /Leo was looking after the raffle box at the school charity fair/);
  assert.match(intro, /The box is gone, and Leo has not come back/);
  assert.match(intro, /say who took the box, and why/);
  assert.match(intro, /class="story-card story-card-case"/);
  assert.match(intro, /class="story-card story-card-play"/);
  assert.match(intro, /id="case-report"/);
  assert.equal((intro.match(/class="report-page"/g) || []).length, 3);
  assert.match(intro, /id="report-back"/);
  assert.match(intro, /id="report-next"/);
  assert.doesNotMatch(intro, />Cover</);
  assert.doesNotMatch(intro, /\bCover\b/);
  assert.match(intro, /<h3>School Mystery<\/h3>/);
  assert.match(intro, /The missing raffle box/);
  assert.doesNotMatch(intro, /Case file/);
  assert.match(intro, />What happened</);
  assert.match(intro, />Your job</);
  assert.doesNotMatch(intro, />Tip</);
  assert.doesNotMatch(intro, /listen for the time/);
  assert.doesNotMatch(intro, /jackets and coats/);
  assert.doesNotMatch(intro, /Amy/);
  assert.doesNotMatch(intro, /book-open\.png/);
  assert.doesNotMatch(intro, /illust\/intro\/report\.png/);
  assert.match(intro, /illust\/intro\/detective\.png/);
  assert.doesNotMatch(intro, /start-looking\.png/);
  assert.match(intro, /illust\/intro\/glass\.png/);
  assert.match(intro, /illust\/intro\/map\.png/);
  assert.match(intro, /illust\/intro\/talk\.png/);
  assert.match(intro, /illust\/intro\/notebook\.png/);
  assert.match(intro, /illust\/intro\/solve\.png/);
  assert.match(intro, /id="start-map"/);
  assert.match(intro, />Start looking</);
  assert.doesNotMatch(intro, /btn-primary/);
  assert.doesNotMatch(intro, /Look around the fair/);
  assert.match(intro, /u1_09_fair\.jpg/);
  assert.doesNotMatch(intro, /class="choice"/);
  assert.equal((html.match(/class="hotspot\b/g) || []).length, 6);
  ['stall', 'wheel', 'film', 'hall', 'desk', 'store'].forEach((id) => {
    assert.match(html, new RegExp('data-hotspot="' + id + '"'));
  });
  const map = html.slice(html.indexOf('id="fair-map"'), html.indexOf('id="scene"'));
  assert.match(map, /illust\/map-school-doorplates\.png/);
  assert.doesNotMatch(map, /class="hotspot\b[^>]*>\s*<img/);
  ['Charity stall', 'Prize wheel', 'Film club', 'School hall', "Miss Chan's desk", 'Storeroom'].forEach((label) => {
    assert.match(map, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  assert.doesNotMatch(html, /u4_comedy\.png/);
  assert.doesNotMatch(html, /id="ask"/);
});

test('notebook and solve page are present, without a missing-person picker', () => {
  const html = huntHtml();
  const notebook = html.slice(html.indexOf('<aside id="notebook"'), html.indexOf('</aside>'));
  assert.match(notebook, /id="notebook-cards"/);
  assert.match(notebook, /Clues from talks and searches are written here/);
  assert.doesNotMatch(notebook, /Nothing written yet/);
  assert.doesNotMatch(notebook, /id="open-people"/);
  assert.doesNotMatch(notebook, /People/);
  assert.doesNotMatch(notebook, /person-avatar/);
  assert.doesNotMatch(notebook, /id="people-list"/);
  assert.doesNotMatch(html, />People</);
  assert.doesNotMatch(html, /id="open-people"/);
  assert.doesNotMatch(html, /id="people"/);
  assert.doesNotMatch(html, /id="people-list"/);
  assert.doesNotMatch(html, /id="hunt-tools"/);
  const stage = html.slice(html.indexOf('class="hunt-stage"'), html.indexOf('id="notebook"'));
  assert.match(stage, />Back to the map</);
  assert.match(notebook, /id="open-solve"/);
  assert.match(notebook, /Solve Case/);
  assert.match(notebook, /disabled/);
  const solve = html.slice(html.indexOf('id="solve"'), html.indexOf('id="ending"'));
  assert.match(solve, /hidden/);
  assert.doesNotMatch(solve, /id="practice"/);
  assert.doesNotMatch(solve, /A comedy ___/);
  assert.match(solve, /About what time did the box arrive backstage\?/);
  assert.doesNotMatch(solve, /leave the stall/);
  assert.match(solve, /id="time-choices"/);
  assert.match(solve, /Who took the box\?/);
  assert.match(solve, /id="who-choices"/);
  assert.match(solve, /Why did they take the box\?/);
  assert.match(solve, /id="solve-who" hidden/);
  assert.match(solve, /id="solve-why" hidden/);
  assert.doesNotMatch(solve, /Close the case/);
  assert.match(solve, /id="why-choices"/);
  assert.doesNotMatch(solve, /Where is Leo/);
  assert.doesNotMatch(solve, /id="where-choices"/);
  assert.match(solve, /id="solve-back"/);
  assert.doesNotMatch(solve, /id="what-choices"/);
  assert.doesNotMatch(solve, /Who is missing/);
  assert.match(html, /href="\.\/">← Game</);
  assert.match(html, /id="back-map"/);
  assert.match(html, /id="scene-actions"/);
  assert.match(html, /id="scene-spots"/);
  assert.match(html, /id="zoom-pop"/);
  assert.match(html, /id="zoom-close"/);
  assert.match(html, /id="ask-pop"/);
  assert.match(html, /id="ask-thread"/);
  assert.doesNotMatch(html, /id="ask-choices"/);
  assert.doesNotMatch(html, /Look on the picture/);
  assert.match(html, /id="ending-copy"/);
});

test('clue hunt styles use fills and contain the pictures', () => {
  const html = huntHtml();
  const css = fs.readFileSync(path.join(root, 'game/game.css'), 'utf8');
  assert.match(html, /game\.css\?v=34/);
  assert.doesNotMatch(css, /#e25c12/);
  assert.match(css, /\.fair-map \{/);
  assert.match(css, /\.hotspot \{[^}]*position:\s*absolute/);
  assert.match(css, /\.hotspot \{[^}]*border:\s*0/);
  assert.match(css, /\.hotspot \{[^}]*background:\s*transparent/);
  assert.doesNotMatch(css, /grid-template-columns:\s*1fr 1fr/);
  assert.match(css, /\.notebook \{[^}]*border:\s*0/);
  assert.match(css, /\.clue-card \{[^}]*border:\s*0/);
  assert.match(css, /\.person-avatar \{[^}]*border-radius:\s*50%/);
  assert.match(css, /\.person-avatar \{[^}]*object-fit:\s*cover/);
  assert.match(css, /\.person-avatar \{[^}]*object-position:\s*center center/);
  assert.match(css, /\.person-avatar \{[^}]*background-color:\s*color-mix\(in srgb, var\(--sunny\) 46%, #fff\)/);
  assert.doesNotMatch(css, /\.case-you-art/);
  assert.match(css, /\.story-card \{[^}]*border:\s*0/);
  assert.doesNotMatch(css, /\.story-card \{[^}]*border:\s*[1-9]/);
  assert.match(css, /\.story-card-case \{[^}]*background:\s*var\(--navy\)/);
  assert.match(css, /\.report-sheet \{[^}]*border:\s*0/);
  assert.match(css, /\.report-sheet \{[^}]*background:\s*#fffaf1/);
  assert.match(css, /\.report-nav button \{[^}]*border:\s*0/);
  assert.match(css, /\.story-card-play \{[^}]*background:\s*var\(--sunny\)/);
  assert.match(css, /\.start-look \{[^}]*border:\s*0/);
  assert.match(css, /\.start-look \{[^}]*background:\s*var\(--coral\)/);
  assert.match(css, /illust\/clipboard-line\.png/);
  assert.match(css, /illust\/clipboard-top\.png/);
  assert.match(css, /#scene-art \{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.fair-map-base \{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.zoom-card \.talk-said \{[^}]*background:\s*var\(--choice-bg\)/);
  assert.doesNotMatch(css, /\.zoom-card \.talk-said \{[^}]*--green/);
  assert.match(css, /\.zoom-card \.talk-reply \{[^}]*background:\s*#fff/);
});

test('page script explores before it grades and does not label the false card', () => {
  const html = huntHtml();
  const script = html.slice(html.lastIndexOf('<script>'), html.lastIndexOf('</script>'));
  assert.equal((script.match(/ClueHunt\.createHunt\(\)/g) || []).length, 1);
  assert.match(script, /ClueHunt\.visit/);
  assert.match(script, /function talkLine/);
  assert.match(script, /speakerId\(hotspot\.id\)/);
  assert.match(script, /talkLine\("you"/);
  assert.doesNotMatch(script, /className = "talk-said"/);
  assert.doesNotMatch(script, /className = "talk-reply"/);
  assert.doesNotMatch(script, /function renderPeople/);
  assert.doesNotMatch(script, /peopleAlbum/);
  assert.doesNotMatch(script, /openPeople/);
  assert.doesNotMatch(script, /notebook\.hidden = true/);
  assert.match(script, /function showMap/);
  assert.match(script, /img\.src = person\.head/);
  assert.match(script, /function showMap\(\) \{[\s\S]*?notebook\.hidden = false/);
  assert.match(script, /function openHotspot\(id\) \{[\s\S]*?notebook\.hidden = false/);
  assert.match(script, /ClueHunt\.notebook/);
  assert.match(script, /purposeEl\.hidden = cards\.length > 0/);
  assert.match(script, /ClueHunt\.solveUnlocked/);
  assert.match(script, /ClueHunt\.displayCard/);
  assert.match(script, /ClueHunt\.submitSolve/);
  assert.match(script, /querySelectorAll\("\.hotspot"\)/);
  assert.match(script, /if \(ended\) return;/);
  assert.match(script, /if \(ended \|\| !ClueHunt\.solveUnlocked\(hunt\)\) return;/);
  assert.doesNotMatch(script, /Who is missing/);
  assert.doesNotMatch(script, /misleading/);
  assert.doesNotMatch(script, /step \+= 1/);
  assert.doesNotMatch(script, /Open this card/);
  assert.doesNotMatch(script, /ClueHunt\.PRACTICE/);
  assert.doesNotMatch(script, /renderPractice/);
});

test('the page script opens every state hotspot by talk or search', () => {
  const html = huntHtml();
  const ClueHunt = require('../game/clue-hunt-state.js');
  ClueHunt.HOTSPOTS.forEach((spot) => {
    assert.match(html, new RegExp('data-hotspot="' + spot.id + '"'));
  });
  const script = html.slice(html.lastIndexOf('<script>'), html.lastIndexOf('</script>'));
  assert.match(script, /hotspot\.kind === "search" \? hotspot\.spots : hotspot\.prompts/);
  assert.match(script, /Ask a question/);
  assert.match(script, /function askNext/);
  assert.match(script, /textContent = "\?"/);
  assert.match(script, /ClueHunt\.visit\(hunt, hotspot\.id, item\.id\)/);
  assert.doesNotMatch(script, /data-hotspot="stall"/);
});

test('scene art files exist and Ken still marks the storeroom pin', () => {
  const ClueHunt = require('../game/clue-hunt-state.js');
  const expected = {
    stall: 'illust/scene-stall-unsigned.png',
    wheel: 'illust/scene-prize-wheel-fair.png',
    film: 'illust/scene-film-sticker.png',
    hall: 'illust/scene-hall-open-box.png',
    desk: 'illust/scene-miss-chan-class.png',
    store: 'illust/scene-storeroom-ken.png'
  };
  ClueHunt.HOTSPOTS.forEach((spot) => {
    assert.equal(spot.art, expected[spot.id]);
    const file = spot.art.startsWith('illust/')
      ? path.join(root, 'game', spot.art)
      : path.join(root, 'game', spot.art);
    const buf = fs.readFileSync(file);
    if (spot.art.startsWith('illust/')) {
      assert.equal(buf[0], 0x89);
      assert.equal(buf.slice(1, 4).toString(), 'PNG');
    } else {
      assert.ok(buf.length > 1000);
    }
  });
  assert.equal(ClueHunt.HOTSPOTS.find((spot) => spot.id === 'store').marker, '../practice/grammar/illust/u1_07_books.jpg');
  const zoomArts = [];
  ClueHunt.HOTSPOTS.forEach((spot) => {
    (spot.spots || []).forEach((action) => {
      (action.hits || []).forEach((hit) => {
        assert.ok(hit.art, spot.id + ' ' + action.id);
        zoomArts.push(hit.art);
        const buf = fs.readFileSync(path.join(root, 'game', hit.art));
        assert.equal(buf[0], 0x89);
        assert.equal(buf.slice(1, 4).toString(), 'PNG');
      });
    });
  });
  assert.equal(new Set(zoomArts).size, 6);
});
