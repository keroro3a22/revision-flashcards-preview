const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const frame = require('../assets/img-frame.js');

test('a missing frame is the largest centered crop', () => {
  assert.deepEqual(frame.normalize(null), { x: 50, y: 50, z: 1 });
  assert.equal(frame.normalize({ z: 0.5 }).z, 1);
  assert.equal(frame.normalize({ z: 4 }).z, 3);
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

test('dragging the frame moves it across the photo and stops at the edge', () => {
  const moved = frame.move({ x: 50, y: 50, z: 1 }, 20, 0, 200, 100, 200, 100, 1);
  assert.equal(moved.x, 60);
  assert.equal(moved.z, 1);
  const stuck = frame.move({ x: 50, y: 50, z: 1 }, 500, 0, 200, 100, 200, 100, 1);
  assert.equal(stuck.x, 75);
});

test('a corner resizes the frame without changing its ratio', () => {
  const next = frame.resize({ x: 50, y: 50, z: 1 }, 'se', -20, -20, 200, 100, 200, 100, 1);
  assert.equal(next.z, 1.25);
  const box = frame.rect(next, 200, 100, 1);
  assert.equal(Math.round(box.width / box.height * 100) / 100, 1);
  const grown = frame.resize(next, 'se', 400, 400, 200, 100, 200, 100, 1);
  assert.equal(grown.z, 1);
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
});
