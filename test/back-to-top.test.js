const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('the public site shows back to top after one screen of scrolling', () => {
  const js = fs.readFileSync('assets/place-ui.js', 'utf8');
  const home = fs.readFileSync('index.html', 'utf8');
  assert.match(js, /id = 'back-to-top'/);
  assert.match(js, /aria-label', 'Back to top'/);
  assert.match(js, /var duration = 280/);
  assert.match(js, /start \* \(1 - t\)/);
  assert.doesNotMatch(js, /behavior: 'smooth'/);
  assert.match(js, /y > height/);
  assert.match(js, /y < height \* 0\.6/);
  assert.match(js, /doc <= height \+ 48/);
  assert.match(js, /back-to-top-pop/);
  assert.match(js, /border-radius:50%/);
  assert.match(js, /top:max\(1rem/);
  assert.match(js, /<path d="M12 19V6"/);
  assert.doesNotMatch(js, /textContent = 'Top'/);
  assert.match(home, /place-ui\.js\?v=17/);
  assert.doesNotMatch(fs.readFileSync('studio.html', 'utf8'), /place-ui\.js/);
});
