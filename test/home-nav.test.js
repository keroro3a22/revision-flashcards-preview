const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');

function nav(file) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const match = html.match(/<nav class="nav-plain"[\s\S]*?<\/nav>/);
  assert.ok(match, file + ' has a primary nav');
  return { html, nav: match[0] };
}

test('homepage topbar is the account link, with book, level, and unit navigation', () => {
  const { html, nav: bar } = nav('index.html');
  assert.match(bar, /href="account\/"/);
  assert.match(bar, />Sign in \/ Sign up</);
  assert.equal(bar.match(/<a\b/g).length, 1);
  assert.doesNotMatch(bar, />Revision</);
  assert.doesNotMatch(bar, />Practice</);
  assert.doesNotMatch(bar, />Game</);
  assert.match(html, /id="place-guide"/);
  assert.doesNotMatch(html, /選好之後，這部裝置會記住。/);
  assert.doesNotMatch(html, /砌緊/);
  assert.doesNotMatch(html, /id="place-header"/);
  assert.doesNotMatch(html, /Oxford · P6/);
  assert.match(html, /<header class="topbar">[\s\S]*id="book-button"/);
  assert.match(html, /<header class="topbar">[\s\S]*id="series-button"/);
  assert.match(html, /<header class="topbar">[\s\S]*id="level-button"/);
  assert.match(html, /<header class="topbar">[\s\S]*id="term-button"/);
  assert.match(html, /id="unit-tabs" role="tablist"/);
  assert.match(html, /id="home-overview"/);
  assert.match(html, /id="hero-title"/);
  assert.match(html, /id="pack-index"/);
  assert.match(html, /class="detective-peek"/);
  assert.doesNotMatch(html, /id="grade-covers"/);
  assert.doesNotMatch(html, />Account</);
  assert.doesNotMatch(html, /<select/);
  assert.match(html, /assets\/place\.js\?v=5/);
  assert.match(html, /assets\/place-ui\.js\?v=18/);
  assert.equal(html.includes('site.css?v=56'), true);
  assert.match(html, /<header class="topbar">[\s\S]*id="unit-tabs" role="tablist"[\s\S]*<\/header>/);
  assert.doesNotMatch(html, /Open Dictation/);
});

test('pack and card art keeps its frame', () => {
  const css = fs.readFileSync(path.join(root, 'assets/site.css'), 'utf8');
  assert.match(css, /scroll-snap-type:\s*x mandatory/);
  const cover = css.slice(css.indexOf('.pack-cover {'), css.indexOf('.pack-body'));
  assert.match(cover, /background:\s*#fff/);
  assert.doesNotMatch(cover, /color-mix\(in srgb, var\(--sky\)/);
  assert.match(cover, /object-fit:\s*contain/);
  assert.doesNotMatch(cover, /object-fit:\s*cover/);
  assert.doesNotMatch(cover, /#000|black/);
  assert.match(css, /\.how-card \.how-art \{[^}]*aspect-ratio:\s*4 \/ 3/);
  assert.match(css, /\.how-card \.how-art img \{[^}]*object-fit:\s*contain/);
  assert.doesNotMatch(css, /\.how-card\.tone-sky \.how-art img/);
  assert.match(css, /\.daily-img \{[^}]*object-fit:\s*contain/);
  assert.match(css, /\.daily-img \{[^}]*background:\s*#fff/);
  const unitCss = fs.readFileSync(path.join(root, 'assets/unit.css'), 'utf8');
  const unitIllust = unitCss.slice(unitCss.indexOf('.illust {'), unitCss.indexOf('.main .num'));
  assert.match(unitIllust, /\.illust img \{[^}]*object-fit:\s*cover/);
  assert.match(unitIllust, /\.illust\.cutout img \{[^}]*object-fit:\s*contain/);
  assert.match(unitIllust, /background:\s*#fff/);
  assert.doesNotMatch(unitIllust, /color-mix\(in srgb, var\(--sky\)/);
  assert.match(css, /\.pack-card \{[^}]*flex:\s*0 0 min\(26rem, 70%\)/);
  assert.match(css, /aspect-ratio:\s*1/);
  assert.doesNotMatch(cover, /max-height:\s*18rem/);
  assert.match(css, /\.nav-jump[\s\S]*border:\s*0/);
  assert.match(css, /\.nav-jump[\s\S]*box-shadow:\s*none/);
});

test('See it and Read it tell students what to do', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const how = html.slice(html.indexOf('id="how"'), html.indexOf('</main>'));
  const blurbs = [...how.matchAll(/<h3>(See it|Read it)<\/h3>\s*<p>([^<]+)<\/p>/g)];
  assert.deepEqual(blurbs.map((match) => match[1]), ['See it', 'Read it']);
  const see = blurbs[0][2];
  const read = blurbs[1][2];
  assert.equal(see, 'Look at the picture for the word. Tap it to enlarge and notice the scene.');
  assert.equal(read, 'Read a textbook sentence and a Form 1 sentence. Traditional Chinese is under each one.');
  [see, read].forEach((text) => {
    assert.ok(text.trim().split(/\s+/).length <= 25, text);
  });
  assert.doesNotMatch(how, /cute art|meaning stick/i);
  assert.match(see, /Tap it to enlarge/);
  assert.match(read, /textbook sentence/);
  assert.match(read, /Form 1/);
  assert.match(read, /Traditional Chinese/);
});

test('pack covers have no black letterbox bars', () => {
  const script = `
from PIL import Image
import os
root = ${JSON.stringify(root)}
names = ['unit1.jpg', 'unit2.jpg', 'unit3.jpg', 'unit4.jpg', 'dictation3.jpg']
for folder in ('covers', 'home-eduhome/covers'):
    for name in names:
        im = Image.open(os.path.join(root, folder, name)).convert('RGB')
        w, h = im.size
        px = im.load()
        edges = {
            'top': [(x, 0) for x in range(w)],
            'bottom': [(x, h - 1) for x in range(w)],
            'left': [(0, y) for y in range(h)],
            'right': [(w - 1, y) for y in range(h)],
        }
        for edge, coords in edges.items():
            dark = 0
            for x, y in coords:
                r, g, b = px[x, y]
                if r < 24 and g < 24 and b < 24:
                    dark += 1
            if dark / len(coords) > 0.45:
                raise SystemExit(folder + '/' + name + ' ' + edge + ' ' + str(dark))
print('ok')
`;
  const out = execFileSync('python3', ['-c', script], { encoding: 'utf8' });
  assert.match(out, /ok/);
});

test('vocab, grammar, and practice keep the top bar and a single back link', () => {
  [
    'unit1/index.html',
    'unit1/grammar/index.html',
    'unit5/index.html',
    'practice/index.html',
    'practice/fill/index.html',
    'practice/grammar/unit1-hub/index.html',
    'practice/grammar/unit2-story/index.html'
  ].forEach((file) => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /place-ui\.js\?v=18/, file);
    assert.match(html, /chrome\.css\?v=4/, file);
    assert.match(html, />← Back to packs</, file);
    assert.doesNotMatch(html, /header-pills/, file);
  });
});

test('badges page has no illustration caption and links Sign in / Sign up', () => {
  const { html, nav: bar } = nav('badges/index.html');
  assert.equal(html.includes('Illustrations of people'), false);
  assert.equal(html.includes('badge-credit'), false);
  assert.equal(html.includes('schoolboy'), false);
  assert.doesNotMatch(html, /index\.html#packs/);
  assert.match(bar, /href="account\/"/);
  assert.match(bar, />Sign in \/ Sign up</);
  assert.equal(bar.match(/<a\b/g).length, 1);
});
