const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const frame = require('../assets/img-frame.js');

test('a missing frame is the largest centered crop on white', () => {
  assert.deepEqual(frame.normalize(null), { x: 50, y: 50, z: 1, bg: '#ffffff' });
  assert.equal(frame.normalize({ z: 0.5 }).z, 0.5);
  assert.equal(frame.normalize({ z: 0.1 }).z, 0.1);
  assert.equal(frame.normalize({ z: 0.02 }).z, 0.05);
  assert.equal(frame.normalize({ z: 4 }).z, 3);
  assert.equal(frame.normalize({ bg: '#ABC' }).bg, '#aabbcc');
});

test('the crop keeps the frame ratio and stays inside the photo', () => {
  const box = frame.rect({ x: 50, y: 50, z: 1 }, 200, 100, 1);
  assert.equal(box.width, 100);
  assert.equal(box.height, 100);
  assert.equal(box.left, 50);
  assert.equal(box.top, 0);
  const tight = frame.rect({ x: 50, y: 50, z: 2 }, 200, 100, 1);
  assert.equal(tight.width, 50);
  assert.equal(tight.height, 50);
  assert.equal(tight.left, 75);
  assert.equal(tight.top, 25);
});

test('dragging the frame can move it past the photo while the picture stays inside', () => {
  const moved = frame.move({ x: 50, y: 50, z: 1, bg: '#112233' }, 80, 0, 200, 100, 200, 100, 1);
  const box = frame.rect(moved, 200, 100, 1);
  assert.ok(box.left + box.width > 200);
  assert.ok(box.left < 200);
  assert.equal(moved.bg, '#112233');
  const loose = frame.rect({ x: 50, y: 50, z: 0.5 }, 200, 100, 1);
  assert.ok(loose.width > 100);
  assert.ok(loose.top < 0);
});

test('a corner resizes the frame without changing its ratio', () => {
  const next = frame.resize({ x: 50, y: 50, z: 1 }, 'se', -20, -20, 200, 100, 200, 100, 1);
  assert.equal(next.z, 1.25);
  const box = frame.rect(next, 200, 100, 1);
  assert.equal(Math.round(box.width / box.height * 100) / 100, 1);
  const grown = frame.resize(next, 'se', 400, 400, 200, 100, 200, 100, 1);
  assert.ok(grown.z < 1);
  assert.ok(grown.z >= 0.05);
  const big = frame.rect(grown, 200, 100, 1);
  assert.equal(Math.round(big.width / big.height * 100) / 100, 1);
});

test('a tall photo can sit inside a frame larger than the picture', () => {
  const grown = frame.resize({ x: 50, y: 50, z: 1 }, 'se', 8000, 8000, 366, 847, 366, 847, 1);
  const box = frame.rect(grown, 366, 847, 1);
  assert.ok(box.height > 847);
  assert.ok(box.width > 366);
  assert.equal(Math.round(box.width / box.height * 100) / 100, 1);
});

test('dragging an edge keeps the frame ratio', () => {
  const next = frame.resize({ x: 50, y: 50, z: 1 }, 'e', -30, 0, 200, 100, 200, 100, 1);
  const box = frame.rect(next, 200, 100, 1);
  assert.equal(Math.round(box.width / box.height * 100) / 100, 1);
  assert.ok(next.z > 1);
});

test('a revision card stays square even before it is on the page', () => {
  function node(classes, extra) {
    extra = extra || {};
    return {
      classList: { contains: function (name) { return classes.indexOf(name) !== -1; } },
      closest: function (sel) { return extra.card && sel === '.card' ? {} : null; },
      isConnected: !!extra.connected
    };
  }
  const wide = Math.round(320 / 220 * 1000) / 1000;
  assert.equal(frame.ratioFor(node(['illust', 'cutout'])), 1);
  assert.equal(frame.ratioFor(node(['illust'], { card: true, connected: true })), 1);
  assert.equal(Math.round(frame.ratioFor(node(['illust', 'chat-hero'], { connected: true })) * 1000) / 1000, wide);
  assert.equal(Math.round(frame.ratioFor(node(['illust'], { connected: true })) * 1000) / 1000, wide);
  const korea = frame.placement({ x: 51, y: 47.3, z: 0.466, bg: '#ffffff' }, 366, 847, 1);
  assert.ok(Math.abs(korea.width / korea.height - 366 / 847) < 0.01);
});

test('a square frame keeps a portrait picture in proportion', () => {
  const spot = frame.placement({ x: 50, y: 50, z: 1 }, 366, 847, 1);
  assert.ok(Math.abs(spot.width / spot.height - 366 / 847) < 0.01);
});

test('the preview uses a fixed crop window instead of a zoom slider', () => {
  const js = fs.readFileSync('assets/studio.js', 'utf8');
  const css = fs.readFileSync('assets/studio.css', 'utf8');
  assert.match(js, /data-corner="nw"/);
  assert.match(js, /data-corner="se"/);
  assert.match(js, /draggable="false"/);
  assert.doesNotMatch(js, /type="range"/);
  assert.match(css, /studio-crop-window/);
  assert.match(css, /-webkit-user-drag:\s*none/);
  assert.match(js, /type="color"/);
  assert.match(js, /EyeDropper/);
  assert.match(js, /studio-dropper/);
  assert.match(js, /data-handle="n"/);
  assert.match(js, /studio-crop-grid/);
  assert.match(css, /\.studio-frame-bar \.studio-dropper \{[^}]*border:\s*0/);
  assert.doesNotMatch(js, /Pick from photo/);
  assert.match(js, /studio-thumb-preview/);
  assert.match(js, /path\.hidden = true/);
  assert.match(css, /studio-thumb-preview img[\s\S]*var\(--crop-left/);
  assert.match(css, /studio-thumb-btn[\s\S]*background:\s*#1d3358/);
});
