const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const grammar = path.join(root, 'practice', 'grammar');

function read(name) {
  const nested = name.endsWith('.html')
    ? path.join(grammar, name.replace(/\.html$/, ''), 'index.html')
    : '';
  if (nested && fs.existsSync(nested)) return fs.readFileSync(nested, 'utf8');
  return fs.readFileSync(path.join(grammar, name), 'utf8');
}

test('story chat and join pages record a grammar session when the set advances', () => {
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    ['story', 'chat', 'join'].forEach(mode => {
      const html = read(unit + '-' + mode + '.html');
      assert.match(html, /src="\.\.\/\.\.\/practice\/badges\.js"/, unit + '-' + mode);
      assert.match(
        html,
        new RegExp("Badges\\.recordGrammarSession\\('" + unit + "', '" + mode + "'\\)"),
        unit + '-' + mode
      );
    });
  });
});

test('chat mysteries need more than one clue and do not name the answer', () => {
  const vm = require('node:vm');
  const banned = ['sword', 'collar', 'cape', 'microphone', 'badge', 'apron', 'whisk', 'mitt'];
  let count = 0;
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    const html = read(unit + '-chat.html');
    const code = html.match(/<script>\s*\(function \(\) \{([\s\S]*)\}\)\(\);\s*<\/script>/)[1];
    const cut = code.split(/function boot\(SETS\)|const SETS/)[0] + '\nthis.__sets = {set1Data,set2Data,set3Data,set4Data,set5Data};';
    const context = vm.createContext({});
    vm.runInContext(cut, context);
    Object.values(context.__sets).forEach(data => {
      count += 1;
      const q = data.endQ;
      assert.ok(q.options.includes(q.answer), q.q);
      assert.equal(q.options.length, 4, q.q);
      assert.equal(q.q.toLowerCase().includes(q.answer.toLowerCase()), false, q.q);
      const obvious = /who (carried|hung|left|wheeled|locked|found|took) /i;
      assert.equal(obvious.test(q.q), false, q.q);
      banned.forEach(word => {
        if (q.answer.toLowerCase().includes(word)) {
          assert.equal(q.q.toLowerCase().includes(word), false, q.q);
        }
      });
      const texts = data.bubbles.map(bubble => bubble.parts.join(' '));
      const blob = (texts.join('\n') + '\n' + q.q).toLowerCase();
      const known = new Set();
      const nameBlock = html.match(/const names = \{([^}]+)\}/);
      if (nameBlock) {
        nameBlock[1].replace(/"([^"]+)"/g, (_, name) => known.add(name.toLowerCase()));
        nameBlock[1].replace(/:\s*([A-Za-z][A-Za-z ]+)/g, (_, name) => known.add(name.trim().toLowerCase()));
      }
      q.options.forEach(opt => {
        const low = opt.toLowerCase();
        const words = low.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(word => word.length > 3);
        const inChat = blob.includes(low) || known.has(low) || words.some(word => blob.includes(word));
        assert.equal(inChat, true, opt + ' / ' + q.q);
      });
      if (/^[A-Z][a-z]+$/.test(q.answer)) {
        const named = texts.filter(text => text.includes(q.answer));
        assert.ok(named.length >= 1, q.answer + ' is never named');
        named.forEach(text => {
          assert.equal(/\bis (the|our|on)\b/i.test(text), false, q.answer + ' labelled in: ' + text);
        });
      }
      if (q.answer.startsWith('The ')) {
        const noun = q.answer.slice(4).toLowerCase();
        assert.ok(texts.some(text => text.toLowerCase().includes(noun)), q.answer);
        texts.forEach(text => {
          if (/someone left/i.test(text)) {
            assert.equal(text.toLowerCase().includes(noun), false, q.answer);
          }
        });
      }
      data.bubbles.forEach(bubble => {
        assert.equal(bubble.options.includes(bubble.answer), true, bubble.explain);
      });
    });
  });
  assert.equal(count, 20);
  const questions = [];
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    const html = read(unit + '-chat.html');
    const code = html.match(/<script>\s*\(function \(\) \{([\s\S]*)\}\)\(\);\s*<\/script>/)[1];
    const cut = code.split(/function boot\(SETS\)|const SETS/)[0] + '\nthis.__sets = {set1Data,set2Data,set3Data,set4Data,set5Data};';
    const context = vm.createContext({});
    vm.runInContext(cut, context);
    Object.values(context.__sets).forEach(data => questions.push(data.endQ.q));
  });
  assert.ok(questions.filter(q => /\bwhere\b/i.test(q)).length >= 8, questions.join('\n'));
  assert.ok(questions.filter(q => /\bwhat\b/i.test(q)).length >= 4, questions.join('\n'));
});

test('chat blanks spread answers and do not repeat one choice cluster', () => {
  const vm = require('node:vm');
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    const html = read(unit + '-chat.html');
    const code = html.match(/<script>\s*\(function \(\) \{([\s\S]*)\}\)\(\);\s*<\/script>/)[1];
    const cut = code.split(/function boot\(SETS\)|const SETS/)[0] + '\nthis.__sets = {set1Data,set2Data,set3Data,set4Data,set5Data};';
    const context = vm.createContext({});
    vm.runInContext(cut, context);
    Object.entries(context.__sets).forEach(([name, data]) => {
      const counts = {};
      const sigs = new Set();
      data.bubbles.forEach(bubble => {
        assert.equal(bubble.options.length, 4, unit + ' ' + name);
        assert.equal(new Set(bubble.options).size, 4, bubble.explain);
        assert.ok(bubble.options.includes(bubble.answer), bubble.explain);
        const key = String(bubble.answer).toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
        sigs.add(JSON.stringify([...bubble.options].sort()));
      });
      assert.ok(sigs.size >= 3, unit + ' ' + name + ' ' + [...sigs].join(' | '));
      const max = Math.max(...Object.values(counts));
      if (unit === 'unit1') {
        ['so many', 'so much', 'who', 'which'].forEach(key => {
          assert.ok(counts[key] >= 2, unit + ' ' + name + ' ' + key);
        });
        assert.ok(max <= 3, unit + ' ' + name + ' ' + JSON.stringify(counts));
      }
      if (unit === 'unit2') {
        assert.ok(counts.will >= 4 && counts['so that'] >= 4, JSON.stringify(counts));
        assert.ok(max <= 6, JSON.stringify(counts));
      }
      if (unit === 'unit3') {
        ['although', 'after', 'before'].forEach(key => {
          assert.ok(counts[key] >= 2, unit + ' ' + name + ' ' + JSON.stringify(counts));
        });
        assert.ok(max <= 4, JSON.stringify(counts));
      }
      if (unit === 'unit4') {
        ['were', 'would', 'as'].forEach(key => {
          assert.ok(counts[key] >= 2, unit + ' ' + name + ' ' + JSON.stringify(counts));
        });
        assert.ok(max <= 4, JSON.stringify(counts));
      }
    });
  });
});

test('chat quest questions are not wrapped in a panel frame', () => {
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    const html = read(unit + '-chat.html');
    assert.match(html, /class="chat-stage" id="game"/, unit);
    assert.doesNotMatch(html, /class="panel" id="game"/, unit);
  });
  const css = read('grammar.css');
  const stage = css.slice(css.indexOf('.chat-stage {'), css.indexOf('.chat-thread {'));
  assert.match(stage, /background:\s*transparent/);
  assert.match(stage, /border:\s*0/);
  assert.match(stage, /box-shadow:\s*none/);
});

test('chat pages count a correct final inference and boss records lives left', () => {
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    const html = read(unit + '-chat.html');
    assert.match(html, /Badges\.recordGrammarInference\(\)/, unit);
  });
  const boss = read('boss.html');
  assert.match(boss, /src="\.\.\/\.\.\/practice\/badges\.js"/);
  assert.match(boss, /Badges\.recordGrammarBoss\(lives\)/);
});

test('join pages use one blank stem and lowercase choices', () => {
  const vm = require('node:vm');
  let total = 0;
  ['unit1', 'unit2', 'unit3', 'unit4'].forEach(unit => {
    const html = read(unit + '-join.html');
    assert.doesNotMatch(html, /Read A and B/);
    assert.doesNotMatch(html, /Join with/);
    assert.doesNotMatch(html, /join-line/);
    assert.doesNotMatch(html, />Sentences</);
    assert.match(html, /id="stem"/);
    assert.match(html, /class="choices join-choices"/);
    assert.match(html, /class="btn-row join-actions"/);
    assert.match(html, /renderStem\(/);
    const code = html.match(/<script>\s*\(function \(\) \{([\s\S]*)\}\)\(\);\s*<\/script>/)[1];
    const cut = code.split(/function boot\(SETS\)|const SETS/)[0] + '\nthis.__sets = {set1Data,set2Data,set3Data,set4Data,set5Data};';
    const context = vm.createContext({});
    vm.runInContext(cut, context);
    const optContext = vm.createContext({});
    const optCut = (code.match(/const choiceOpts = \[[^\]]+\];/) || ['const choiceOpts = ["who","which"];'])[0] + '\nthis.choiceOpts = choiceOpts;';
    vm.runInContext(optCut, optContext);
    optContext.choiceOpts.forEach(opt => {
      assert.equal(opt, opt.toLowerCase(), unit + ' ' + opt);
    });
    let count = 0;
    Object.values(context.__sets).forEach(data => {
      data.items.forEach(it => {
        count += 1;
        assert.equal(it.answer, it.answer.toLowerCase(), it.full);
        assert.ok(it.preview.includes('REL'), it.full);
        const built = it.preview.map(p => {
          if (p !== 'REL') return p;
          if (it.fillMap && it.fillMap[it.answer]) return it.fillMap[it.answer];
          return it.answer;
        }).join('');
        assert.equal(built.toLowerCase(), it.full.toLowerCase(), it.full);
      });
    });
    assert.equal(count, 30, unit);
    total += count;
  });
  assert.equal(total, 120);
  const boss = read('boss.html');
  assert.doesNotMatch(boss, /join-line/);
  assert.doesNotMatch(boss, /Tap <strong>who<\/strong>/);
  assert.match(boss, /renderJoinStem\(/);
  const joins = [...boss.matchAll(/kind: "join"[\s\S]*?full: "([^"]+)"/g)];
  assert.equal(joins.length, 10);
  joins.forEach(m => {
    assert.match(m[1], / (who|which) /);
  });
});

test('grammar banners only go back to packs', () => {
  const html = read('grammar-hub.html');
  assert.match(html, /class="back" href="\.\.\/\.\.\/">← Back to packs</);
  assert.doesNotMatch(html, /header-pills/);
  ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'].forEach(unit => {
    const hub = read(unit + '-hub.html');
    assert.match(hub, /class="back" href="\.\.\/\.\.\/">← Back to packs</, unit);
    assert.doesNotMatch(hub, /header-home/, unit);
    assert.doesNotMatch(hub, /header-practice/, unit);
  });
});

test('comedy comparisons are not measured against an action film', () => {
  ['unit4-story.html', 'unit4-chat.html', 'unit4-join.html'].forEach(file => {
    const html = read(file);
    assert.equal(/funny as the action film/i.test(html), false, file);
    assert.equal(/as funny as the action film/i.test(html), false, file);
  });
});

test('chat bubbles are not outlined in coral', () => {
  const css = read('grammar.css');
  const blank = css.slice(css.indexOf('.bubble .blank {'), css.indexOf('.bubble .blank.filled'));
  assert.match(blank, /justify-content:\s*center/);
  assert.match(blank, /align-items:\s*center/);
  assert.match(blank, /text-align:\s*center/);
  const rule = css.slice(css.indexOf('.bubble.active-bubble'), css.indexOf('.chat-reply-label'));
  assert.match(rule, /\.bubble\.active-bubble/);
  assert.doesNotMatch(rule, /coral/);
  assert.match(css, /\.join-choices \{/);
  assert.match(css, /--choice-bg:\s*color-mix\(in srgb, var\(--sky\) 42%, #fff\)/);
  assert.match(css, /--choice-ink:\s*var\(--navy\)/);
  assert.match(css, /--choice-selected-bg:\s*var\(--sky\)/);
  const choiceRule = css.slice(css.indexOf('.choice {'), css.indexOf('.choice:hover'));
  assert.match(choiceRule, /background:\s*var\(--choice-bg\)/);
  assert.match(choiceRule, /color:\s*var\(--choice-ink\)/);
  assert.match(choiceRule, /border:\s*0/);
  assert.doesNotMatch(choiceRule, /background:\s*var\(--cream\)/);
  ['amy', 'tom', 'miss', 'ken', 'leo', 'sam', 'mia', 'chef'].forEach(role => {
    assert.match(css, new RegExp('--bubble-' + role + ':'));
    assert.match(css, new RegExp('\\.bubble\\.' + role + ' \\{[^}]*background:\\s*var\\(--bubble-' + role + '\\)'));
  });
  const thread = css.slice(css.indexOf('.chat-thread {'), css.indexOf('.bubble {'));
  assert.match(thread, /max-height:\s*none/);
  assert.match(thread, /overflow:\s*visible/);
  assert.doesNotMatch(css, /\.chat-thread \{[^}]*overflow-y:\s*auto/);
  assert.doesNotMatch(css, /\.chat-thread \{[^}]*max-height:\s*min\(/);
  assert.match(rule, /box-shadow:\s*none/);
  assert.match(css, /\.btn-ghost \{ background: var\(--cream\)/);
  assert.match(css, /\.btn-primary \{ background: var\(--coral\)/);
  assert.match(css, /\.join-actions \.btn-primary/);
  assert.match(css, /\.join-actions \.btn-ghost/);
  const illust = css.slice(css.indexOf('.illust img'), css.indexOf('.illust svg'));
  assert.match(illust, /object-fit:\s*contain/);
  assert.doesNotMatch(illust, /cover/);
  assert.match(illust, /border-radius:\s*var\(--radius-sm\)/);
  assert.match(illust, /max-height:\s*var\(--q-art-max\)/);
  assert.match(css, /--q-art-max:\s*min\(34vh,\s*300px\)/);
  assert.match(css, /--q-art-max:\s*min\(28vh,\s*220px\)/);
  assert.match(css, /--q-art-max:\s*min\(32vh,\s*340px\)/);
  assert.doesNotMatch(css, /max-height:\s*min\(15vh,\s*112px\)/);
  assert.doesNotMatch(css, /max-height:\s*min\(18vh,\s*148px\)/);
  const story = css.slice(css.indexOf('.story-panel-art img'), css.indexOf('.story-beat-label'));
  assert.match(story, /object-fit:\s*contain/);
  assert.doesNotMatch(story, /cover/);
  assert.match(story, /border-radius:\s*var\(--radius-sm\)/);
  const frame = css.slice(css.indexOf('.illust {'), css.indexOf('.illust.sky'));
  assert.match(frame, /overflow:\s*hidden/);
  assert.match(frame, /border-radius:\s*var\(--radius-sm\)/);
});
