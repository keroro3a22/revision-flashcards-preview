const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const grammar = path.join(root, 'practice', 'grammar');
const units = ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'];

function read(name) {
  return fs.readFileSync(path.join(grammar, name), 'utf8');
}

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, 'missing ' + signature);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('unclosed ' + signature);
}

test('hard badge sits on the prompt line instead of a full line above it', () => {
  const css = read('grammar.css');
  const start = css.indexOf('.hard-badge {');
  assert.notEqual(start, -1);
  const rule = css.slice(start, css.indexOf('\n}', start));
  assert.match(rule, /vertical-align:\s*middle/);
  assert.match(rule, /margin-left:\s*0\.25rem/);
  assert.match(rule, /color:\s*transparent/);
  assert.match(rule, /font-size:\s*0/);
  assert.match(rule, /illust\/harder-badge\.png/);
  assert.doesNotMatch(rule, /top:\s*-/);
  assert.doesNotMatch(rule, /position:\s*relative/);
});

test('story pages put the harder badge on the fill-in prompt', () => {
  units.forEach((unit) => {
    const html = read(unit + '-story.html');
    const prompt = extractFunction(html, 'function renderPrompt(');
    const render = extractFunction(html, 'function render()');
    assert.match(prompt, /if \(s\.hard\) html \+= '<span class="hard-badge">Harder<\/span>';/, unit);
    assert.doesNotMatch(render, /hard-badge/, unit + ' scene title');
    assert.match(render, /beatLabel\.textContent = s\.label;/, unit);
  });
});

test('join pages put the harder badge on the sentence stem', () => {
  units.forEach((unit) => {
    const html = read(unit + '-join.html');
    const stem = extractFunction(html, 'function renderStem(');
    const render = extractFunction(html, 'function render()');
    assert.match(stem, /if \(item\.hard\) html \+= '<span class="hard-badge">Harder<\/span>';/, unit);
    assert.doesNotMatch(render, /hard-badge/, unit + ' progress chip');
    assert.match(render, /qNum\.textContent = \(idx \+ 1\) \+ " \/ " \+ items\.length;/, unit);
  });
});

test('chat pages put the harder badge on the message stem', () => {
  units.forEach((unit) => {
    const html = read(unit + '-chat.html');
    const bubble = extractFunction(html, 'function buildBubbleHtml(');
    assert.match(bubble, /function buildBubbleHtml\(parts, value, mode, hard\)/, unit);
    assert.match(bubble, /if \(hard\) html \+= '<span class="hard-badge">Harder<\/span>';/, unit);
    assert.doesNotMatch(html, /qLabel\.innerHTML[\s\S]{0,240}hard-badge/, unit);
    assert.match(
      html,
      /qLabel\.textContent = "Fill the blank in " \+ names\[bubbles\[idx\]\.speaker\] \+ "’s message";/,
      unit
    );
    const calls = [...html.matchAll(/buildBubbleHtml\(([^)]*)\)/g)]
      .map((match) => match[1])
      .filter((args) => args.includes('b.parts'));
    assert.equal(calls.length, 3, unit + ' ' + calls.join(' | '));
    calls.forEach((args) => assert.match(args, /\bb\.hard\b/, unit + ' ' + args));
  });
});

test('boss still appends the harder badge at the end of the prompt stem', () => {
  const html = read('boss.html');
  ['function renderPrompt(', 'function renderJoinStem('].forEach((signature) => {
    const fn = extractFunction(html, signature);
    assert.match(fn, /if \(it\.hard\) html \+= '<span class="hard-badge">Harder<\/span>';/, signature);
    const assign = fn.lastIndexOf('prompt.innerHTML = html;');
    const badge = fn.indexOf('hard-badge');
    assert.ok(badge !== -1 && assign !== -1 && badge < assign, signature);
  });
});

test('pages that link grammar.css pick up the badge alignment', () => {
  const pages = [];
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      if (entry.name === 'node_modules' || entry.name === '.git') return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) pages.push(full);
    });
  }
  walk(root);
  const linked = pages.filter((file) => fs.readFileSync(file, 'utf8').includes('grammar.css?'));
  assert.ok(linked.length >= 20);
  linked.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    assert.match(html, /grammar\.css\?v=48/, path.relative(root, file));
    assert.doesNotMatch(html, /grammar\.css\?v=47/, path.relative(root, file));
  });
});
