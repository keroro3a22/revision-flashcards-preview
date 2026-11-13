const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');

const HINT = 'Tap Play for audio. Tap the illustration to enlarge.';

function block(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(escaped + '\\s*\\{([^}]*)\\}'));
  assert.ok(match, selector + ' rule');
  return match[1];
}

test('page banners scroll away with the page', () => {
  const checks = [
    ['assets/unit.css', '.unit-header'],
    ['practice/practice.css', '.prac-header'],
    ['practice/grammar/grammar.css', '.prac-header'],
    ['assets/site.css', '.topbar']
  ];
  checks.forEach(([file, selector]) => {
    const body = block(fs.readFileSync(file, 'utf8'), selector);
    assert.doesNotMatch(body, /position:\s*sticky/, file + ' ' + selector);
  });
});

test('vocab and grammar revision banners show the play hint', () => {
  ['unit1', 'unit2', 'unit3', 'unit4', 'unit5', 'unit6'].forEach((unit) => {
    ['index.html', 'grammar/index.html'].forEach((file) => {
      const html = fs.readFileSync(path.join(unit, file), 'utf8');
      const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
      assert.match(header, new RegExp('<p class="sub">' + HINT.replace(/\./g, '\\.') + '</p>'), unit + '/' + file);
      assert.doesNotMatch(header, /Primary 6 examples/, unit + '/' + file);
      assert.doesNotMatch(html, /<p class="hint">/, unit + '/' + file);
    });
  });
});
